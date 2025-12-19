import { createClient } from '@farcaster/quick-auth';

const client = createClient();

export interface ValidatedUser {
    fid: number;
}

export async function verifyAuth(authHeader: string | undefined): Promise<ValidatedUser | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify the JWT using the client
        const result = await client.verifyJwt({
            token: token,
            domain: 'fcphunksmini.vercel.app',
        });

        if (result.success && result.payload && typeof result.payload === 'object' && 'sub' in result.payload) {
            const sub = result.payload.sub as string;
            return {
                fid: parseInt(sub),
            };
        }
        return null;
    } catch (error) {
        console.error('JWT Verification Error:', error);
        return null;
    }
}
