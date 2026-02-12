// Express 앱 진입점
// 서버 설정, 라우터 등록, 미들웨어 설정

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import classificationRoutes from './routes/classification.routes';
import categoryRoutes from './routes/category.routes';
import chatRoutes from './routes/chat.routes';
import conversationRoutes from './routes/conversation.routes';
import escalationRoutes from './routes/escalation.routes'; // F-06
import feedbackRoutes from './routes/feedback.routes'; // F-09
import analyticsRoutes from './routes/analytics.routes'; // F-08
import templateRoutes from './routes/template.routes'; // F-07
import { errorHandler } from './middleware/error-handler.middleware';

// 환경변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우터 등록
app.use('/api/auth', authRoutes);
app.use('/api', classificationRoutes);
app.use('/api', categoryRoutes);
app.use('/api', chatRoutes);
app.use('/api', conversationRoutes);
app.use('/api', escalationRoutes); // F-06
app.use('/api', feedbackRoutes); // F-09
app.use('/api', analyticsRoutes); // F-08
app.use('/api', templateRoutes); // F-07

// 헬스 체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// 에러 핸들러 (반드시 마지막에 등록)
app.use(errorHandler);

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
