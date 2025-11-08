// matching-service/src/userService.ts

import axios from 'axios';

const USER_SERVICE_BASE_URL = 'http://user-service:3002/user'; 

/**
 * Records a completed question ID in the User Service's history.
 * This is called for each user after a match is fully accepted.
 * @param userId The ID of the user.
 * @param questionId The ID of the question.
 */
export async function recordQuestionCompletion(userId: string, questionId: string): Promise<void> {
    const url = `${USER_SERVICE_BASE_URL}/${userId}/history`;
    
    try {
        const response = await axios.post(url, {
            questionId: questionId 
        });
        
        console.log(`[History] Successfully initiated history record for user ${userId}. Status: ${response.status}`);
    } catch (error) {
        console.error(`[History] Failed to record question completion for user ${userId}:`, error);
        throw error; 
    }
}