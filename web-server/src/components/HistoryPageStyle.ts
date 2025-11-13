import styled from 'styled-components';

export const Container = styled.div`
    padding: 24px;
    display: flex;
    height: 100%;
    gap: 24px;
`;

export const Panel = styled.div`
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 16px;
    overflow-y: auto;
`;

export const ListPanel = styled(Panel)`
    width: 350px;
    max-height: 100%;
`;

export const DetailsPanel = styled(Panel)`
    flex-grow: 1;
    max-height: 100%;
`;

export const Title = styled.h2`
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const Subtitle = styled.h3`
    margin: 0 0 16px 0;
    font-size: 1.5rem;
    font-weight: 600;
`;

export const Divider = styled.hr`
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 16px 0;
`;

export const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    padding: 32px;
`;

export const Spinner = styled.div`
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

export const SmallSpinner = styled(Spinner)`
    width: 24px;
    height: 24px;
    border-width: 2px;
`;

export const EmptyMessage = styled.p`
    color: #666;
    text-align: center;
    padding: 16px;
`;

export const ListItem = styled.button<{ $selected?: boolean }>`
    width: 100%;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid ${props => props.$selected ? '#3498db' : '#e0e0e0'};
    border-radius: 4px;
    background: ${props => props.$selected ? '#e3f2fd' : 'white'};
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;

    &:hover {
        background: ${props => props.$selected ? '#e3f2fd' : '#f5f5f5'};
        border-color: #3498db;
    }
`;

export const ListItemTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    margin-bottom: 4px;
    color: #333;
`;

export const ListItemTime = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    color: #666;
`;

export const QuestionTitle = styled.h4`
    color: #3498db;
    font-size: 1.25rem;
    margin: 0 0 8px 0;
`;

export const DifficultyBadge = styled.span`
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
    background: #f0f0f0;
    color: #666;
    margin-bottom: 16px;
`;

export const Content = styled.div`
    white-space: pre-wrap;
    line-height: 1.6;
    color: #333;
`;

export const PlaceholderText = styled.p`
    color: #999;
    text-align: center;
    padding: 64px 32px;
`;

export const SectionTitle = styled.h4`
    margin: 24px 0 12px;
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
`;

export const MetadataGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
`;

export const MetadataCard = styled.div`
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    background: #fafafa;

    small {
        display: block;
        font-size: 0.75rem;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
    }

    strong {
        display: block;
        font-size: 0.95rem;
        color: #111827;
    }
`;

export const TopicList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
`;

export const TopicTag = styled.span`
    font-size: 0.8rem;
    padding: 4px 10px;
    border-radius: 999px;
    background: #e0f2fe;
    color: #0369a1;
`;

export const MetaRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
`;

export const MetaBadge = styled.span<{ $variant?: 'difficulty' | 'language' }>`
    font-size: 0.8rem;
    padding: 4px 10px;
    border-radius: 6px;
    color: #0f172a;
    background: ${({ $variant }) =>
        $variant === 'difficulty' ? '#fef3c7' : '#e0f2fe'};
`;

export const ErrorText = styled.p`
    color: #b91c1c;
    text-align: center;
`;