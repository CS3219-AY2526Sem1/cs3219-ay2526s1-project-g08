import styled from 'styled-components';

export const Container = styled.div`
    padding: 24px;
    display: flex;
    height: 100%;
    gap: 24px;
    background: #1e1e1e;
`;

export const Panel = styled.div`
    background: #252526;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    padding: 16px;
    overflow-y: auto;
`;

export const ListPanel = styled(Panel)`
    width: 100%;
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
    color: #e0e0e0;
`;

export const Subtitle = styled.h3`
    margin: 0 0 16px 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #e0e0e0;
`;

export const Divider = styled.hr`
    border: none;
    border-top: 1px solid #3e3e42;
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
    color: #a0a0a0;
    text-align: center;
    padding: 16px;
`;

export const ListItem = styled.button<{ $selected?: boolean }>`
    width: 100%;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid ${props => props.$selected ? '#0e639c' : '#3e3e42'};
    border-radius: 4px;
    background: ${props => props.$selected ? '#094771' : '#2d2d30'};
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;

    &:hover {
        background: ${props => props.$selected ? '#094771' : '#3e3e42'};
        border-color: #0e639c;
    }
`;

export const ListItemTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    margin: 5px;
    color: #e0e0e0;
`;

export const ListItemTime = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: #a0a0a0;
    margin: 5px;
`;

export const QuestionTitle = styled.h4`
    color: #4fc3f7;
    font-size: 1.25rem;
    margin: 0 0 8px 0;
`;

export const DifficultyBadge = styled.span`
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
    background: #3e3e42;
    color: #d4d4d4;
    margin-bottom: 16px;
`;

export const Content = styled.div`
    white-space: pre-wrap;
    line-height: 1.6;
    color: #d4d4d4;
`;

export const PlaceholderText = styled.p`
    color: #6e6e6e;
    text-align: center;
    padding: 64px 32px;
`;

export const SectionTitle = styled.h4`
    margin: 24px 0 12px;
    font-size: 1rem;
    font-weight: 600;
    color: #e0e0e0;
`;

export const MetadataGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
`;

export const MetadataCard = styled.div`
    border: 1px solid #3e3e42;
    border-radius: 8px;
    padding: 12px;
    background: #2d2d30;

    small {
        display: block;
        font-size: 0.75rem;
        color: #a0a0a0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
    }

    strong {
        display: block;
        font-size: 0.95rem;
        color: #e0e0e0;
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
    background: #1e3a5f;
    color: #4fc3f7;
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
    color: #e0e0e0;
    background: ${({ $variant }) =>
        $variant === 'difficulty' ? '#5a4a1f' : '#1e3a5f'};
`;

export const ErrorText = styled.p`
    color: #f48771;
    text-align: center;
`;