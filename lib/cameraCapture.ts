let activeStream: MediaStream | null = null;

export async function startCamera(
    videoEl: HTMLVideoElement
): Promise<MediaStream> {
    stopCamera();

    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
        },
        audio: false,
    });

    activeStream = stream;
    videoEl.srcObject = stream;
    await videoEl.play();
    return stream;
}

export function stopCamera() {
    activeStream?.getTracks().forEach(t => t.stop());
    activeStream = null;
}

export function captureFrame(videoEl: HTMLVideoElement): string {
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    canvas.getContext("2d")!.drawImage(videoEl, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.95);
}

export function compressImage(
    base64: string,
    maxWidth = 1280,
    quality = 0.88
): Promise<string> {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxWidth / img.width);
            const canvas = document.createElement("canvas");
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = base64;
    });
}
