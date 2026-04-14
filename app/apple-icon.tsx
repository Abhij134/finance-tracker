import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Image metadata
export const size = {
    width: 180,
    height: 180,
};
export const contentType = 'image/png';

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#050810',
                }}
            >
                <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 40 165 L 70 135 L 10 165 Z" fill="#4b5563" />
                    <path d="M 40 105 L 70 75 L 70 135 L 40 165 Z" fill="#10b981" />

                    <path d="M 85 165 L 115 135 L 55 165 Z" fill="#4b5563" />
                    <path d="M 85 60 L 115 30 L 115 135 L 85 165 Z" fill="#10b981" />

                    <path d="M 130 165 L 160 135 L 100 165 Z" fill="#4b5563" />
                    <path d="M 130 80 L 160 50 L 160 135 L 130 165 Z" fill="#10b981" />
                </svg>
            </div>
        ),
        { ...size }
    );
}
