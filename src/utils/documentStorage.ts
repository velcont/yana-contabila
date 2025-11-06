import { supabase } from "@/integrations/supabase/client";

export interface DocumentToSave {
  documentType: string;
  documentTitle: string;
  mainFileBlob: Blob;
  mainFileExtension: string;
  guideFileBlob?: Blob;
  bibliographyFileBlob?: Blob;
  zipFileBlob?: Blob;
  wordCount?: number;
  metadata?: Record<string, any>;
}

export const saveDocumentToLibrary = async ({
  documentType,
  documentTitle,
  mainFileBlob,
  mainFileExtension,
  guideFileBlob,
  bibliographyFileBlob,
  zipFileBlob,
  wordCount,
  metadata = {},
}: DocumentToSave) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const timestamp = Date.now();
    const sanitizedTitle = documentTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const userFolder = `${user.id}`;

    // Upload main document
    const mainFileName = `${userFolder}/${sanitizedTitle}_${timestamp}.${mainFileExtension}`;
    const { error: mainError } = await supabase.storage
      .from("generated-documents")
      .upload(mainFileName, mainFileBlob, {
        contentType: mainFileExtension === 'docx' 
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf',
        upsert: false,
      });

    if (mainError) throw mainError;

    let guidePath: string | null = null;
    let bibliographyPath: string | null = null;
    let zipPath: string | null = null;

    // Upload guide if provided
    if (guideFileBlob) {
      const guideFileName = `${userFolder}/${sanitizedTitle}_GHID_${timestamp}.pdf`;
      const { error: guideError } = await supabase.storage
        .from("generated-documents")
        .upload(guideFileName, guideFileBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (guideError) throw guideError;
      guidePath = guideFileName;
    }

    // Upload bibliography if provided
    if (bibliographyFileBlob) {
      const bibFileName = `${userFolder}/${sanitizedTitle}_BIBLIOGRAFIE_${timestamp}.xlsx`;
      const { error: bibError } = await supabase.storage
        .from("generated-documents")
        .upload(bibFileName, bibliographyFileBlob, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          upsert: false,
        });

      if (bibError) throw bibError;
      bibliographyPath = bibFileName;
    }

    // Upload ZIP if provided
    if (zipFileBlob) {
      const zipFileName = `${userFolder}/${sanitizedTitle}_PACHET_COMPLET_${timestamp}.zip`;
      const { error: zipError } = await supabase.storage
        .from("generated-documents")
        .upload(zipFileName, zipFileBlob, {
          contentType: 'application/zip',
          upsert: false,
        });

      if (zipError) throw zipError;
      zipPath = zipFileName;
    }

    // Save metadata to database
    const { data: docData, error: docError } = await supabase
      .from("generated_documents")
      .insert({
        user_id: user.id,
        document_type: documentType,
        document_title: documentTitle,
        main_file_path: mainFileName,
        guide_file_path: guidePath,
        bibliography_file_path: bibliographyPath,
        zip_file_path: zipPath,
        word_count: wordCount,
        metadata,
      })
      .select()
      .single();

    if (docError) throw docError;

    return { success: true, documentId: docData.id };
  } catch (error) {
    console.error("Error saving document to library:", error);
    throw error;
  }
};
