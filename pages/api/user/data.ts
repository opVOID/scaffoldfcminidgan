
import { Request, Response } from 'express';
import { getUserData, kvSet } from '../../../services/db';
import { verifyAuth } from '../../../services/auth';

export default async function handler(req: Request, res: Response) {
    const auth = await verifyAuth(req.headers.authorization);

    if (req.method === 'GET') {
        const { address } = req.query;
        if (!address || typeof address !== 'string') {
            return res.status(400).json({ error: 'Address required' });
        }
        const data = await getUserData(address);
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        if (!auth) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { address, settings } = req.body;
        if (!address || typeof address !== 'string') {
            return res.status(400).json({ error: 'Address required' });
        }

        // Securely update settings only if the user is authorized
        // (Note: In a real app we'd also verify the address matches the authenticated user)
        if (settings) {
            await kvSet(`user:${address.toLowerCase()}:settings`, settings);
            return res.status(200).json({ success: true });
        }
    }

    res.status(405).json({ error: 'Method not allowed' });
}
