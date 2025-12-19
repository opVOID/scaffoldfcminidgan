
import { Request, Response } from 'express';
import { getLeaderboard, updateLeaderboard } from '../../services/db';
import { verifyAuth } from '../../services/auth';

export default async function handler(req: Request, res: Response) {
    if (req.method === 'GET') {
        const { limit } = req.query;
        const l = limit ? parseInt(limit as string) : 50;
        const data = await getLeaderboard(l);
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const auth = await verifyAuth(req.headers.authorization);
        if (!auth) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { address, score } = req.body;
        if (!address || score === undefined) {
            return res.status(400).json({ error: 'Address and score required' });
        }

        try {
            await updateLeaderboard(address, score);
            return res.status(200).json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    res.status(405).json({ error: 'Method not allowed' });
}
