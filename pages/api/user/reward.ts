
import { Request, Response } from 'express';
import { getUserData, kvSet } from '../../../services/db';
import { verifyAuth } from '../../../services/auth';

export default async function handler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const auth = await verifyAuth(req.headers.authorization);
    if (!auth) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { address } = req.body;
    if (!address || typeof address !== 'string') {
        return res.status(400).json({ error: 'Address required' });
    }

    try {
        let userData = await getUserData(address);
        userData.xp += 1;
        await kvSet(`user:${address.toLowerCase()}:data`, userData);
        return res.status(200).json({ success: true, xpAdded: 1 });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
