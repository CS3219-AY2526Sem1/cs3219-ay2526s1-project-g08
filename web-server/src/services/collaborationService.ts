export async function createSession(
    participants: string[],
    questionId: string,
    difficulty: string,
    topic: string,
    language: string,
    authToken: string
) {
    const response = await fetch('http://localhost:3004/api/collaboration/sessions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            participants,
            questionId,
            difficulty,
            topic,
            language
        })
    });

    if (!response.ok) {
        throw new Error('Failed to create collaboration session');
    }

    return response.json();
}
