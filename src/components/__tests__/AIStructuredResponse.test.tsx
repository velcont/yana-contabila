import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AIStructuredResponse } from '../AIStructuredResponse';

describe('AIStructuredResponse', () => {
  it('should render with content', () => {
    const { getByText } = render(
      <AIStructuredResponse 
        content="This is test content"
      />
    );
    
    expect(getByText('This is test content')).toBeInTheDocument();
  });

  it('should render sections', () => {
    const sections = [
      { title: 'Overview', content: 'This is an overview section.' },
      { title: 'Details', content: 'This is details section.' },
    ];
    
    const { getByText } = render(
      <AIStructuredResponse 
        content="Main content"
        sections={sections}
      />
    );
    
    expect(getByText('Overview')).toBeInTheDocument();
    expect(getByText('This is an overview section.')).toBeInTheDocument();
  });

  it('should render key insights', () => {
    const keyInsights = [
      { text: 'Insight 1', type: 'positive' as const },
      { text: 'Insight 2', type: 'neutral' as const },
    ];
    
    const { getByText } = render(
      <AIStructuredResponse 
        content="Main content"
        keyInsights={keyInsights}
      />
    );
    
    expect(getByText(/Insight 1/)).toBeInTheDocument();
    expect(getByText(/Insight 2/)).toBeInTheDocument();
  });

  it('should render action items', () => {
    const actionItems = [
      { text: 'Action 1', priority: 'high' as const },
      { text: 'Action 2', priority: 'medium' as const },
    ];
    
    const { getByText } = render(
      <AIStructuredResponse 
        content="Main content"
        actionItems={actionItems}
      />
    );
    
    expect(getByText(/Action 1/)).toBeInTheDocument();
    expect(getByText(/Action 2/)).toBeInTheDocument();
  });

  it('should render sources with links', () => {
    const sources = [
      { title: 'Source 1', url: 'https://example.com/1', domain: 'example.com' },
    ];
    
    const { getByText } = render(
      <AIStructuredResponse 
        content="Main content"
        sources={sources}
      />
    );
    
    const link = getByText('Source 1');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/1');
  });

  it('should handle empty props gracefully', () => {
    expect(() => {
      render(<AIStructuredResponse content="" />);
    }).not.toThrow();
  });

  it('should render related questions', () => {
    const relatedQuestions = ['Question 1?', 'Question 2?'];
    
    const { getByText } = render(
      <AIStructuredResponse 
        content="Main content"
        relatedQuestions={relatedQuestions}
      />
    );
    
    expect(getByText('Question 1?')).toBeInTheDocument();
    expect(getByText('Question 2?')).toBeInTheDocument();
  });
});
