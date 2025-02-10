import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyD8LKVDXO5zAFYbINcKHII-fiDa6rDexR4';
const genAI = new GoogleGenerativeAI(API_KEY);

export async function getGeminiResponse(prompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return 'Sorry, I encountered an error while processing your request.';
  }
}