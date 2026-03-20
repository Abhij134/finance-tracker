import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';

const sizes = [
    { file: 'public/favicon.png', size: 32 },
    { file: 'public/apple-touch-icon.png', size: 180 },
    { file: 'public/icon-192.png', size: 192 },
    { file: 'public/icon-512.png', size: 512 },
];

async function generate() {
    for (const { file, size } of sizes) {
        await sharp('public/logo.svg')
            .resize(size, size)
            .png()
            .toFile(file);
        console.log(`✓ ${file}`);
    }
}

generate().catch(console.error);
