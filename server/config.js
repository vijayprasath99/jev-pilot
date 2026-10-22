import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  jevEndpoint: process.env.JEV_ENDPOINT || 'http://localhost:1234/v1/systemone',
  jevModel: process.env.JEV_MODEL || 'clef-flash',
  jevApiKey: process.env.JEV_API_KEY || 'lm-studio'
};
