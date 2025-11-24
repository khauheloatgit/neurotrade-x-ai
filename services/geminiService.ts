
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    signal: {
      type: Type.STRING,
      enum: ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'],
      description: "The trading signal based on analysis."
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence score between 0 and 100."
    },
    reasoning: {
      type: Type.STRING,
      description: "Technical analysis reasoning (Max 20 words)."
    },
    insiderNote: {
      type: Type.STRING,
      description: "A cryptic note simulating insider/whale wallet tracking or dark pool sentiment (Max 15 words)."
    }
  },
  required: ['signal', 'confidence', 'reasoning', 'insiderNote']
};

export const analyzeMarket = async (
  currentPrice: number,
  rsi: number,
  trend: string
): Promise<AIAnalysis> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      Act as a high-frequency trading algorithm with access to advanced fundamentals and dark pool data.
      Current Market Data for Bitcoin (BTC):
      - Price: $${currentPrice.toFixed(2)}
      - RSI (14): ${rsi.toFixed(2)}
      - Trend: ${trend}
      
      Generate a trading signal.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
        temperature: 0.7, 
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysis;
    }
    
    throw new Error("No response text");
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Fallback safe response
    return {
      signal: 'HOLD',
      confidence: 50,
      reasoning: "Connection to neural core unstable. Holding position.",
      insiderNote: "Data stream interrupted."
    };
  }
};
