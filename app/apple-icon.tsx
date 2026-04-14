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
                    <polygon points="40,165 70,135 10,165" fill="#4b5563" />
                    <polygon points="40,105 70,75 70,135 40,165" fill="#10b981" />

                    <polygon points="85,165 115,135 55,165" fill="#4b5563" />
                    <polygon points="85,60 115,30 115,135 85,165" fill="#10b981" />

                    <polygon points="130,165 160,135 100,165" fill="#4b5563" />
                    <polygon points="130,80 160,50 160,135 130,165" fill="#10b981" />
                </svg>
            </div>
        ),
        { ...size }
    );
}
