/** @jsxImportSource frog/jsx */

import { Button, Frog, TextInput } from 'frog'
import { handle } from 'frog/next'
import { neynar } from 'frog/hubs'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'
const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
  hub: neynar({ apiKey: process.env.NEYNAR_API_KEY || 'NEYNAR_FROG_FM' }),
  title: 'Livepeer AI Frame',
})

const FrameImage = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      width: '1200px',
      height: '628px',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px',
      textAlign: 'center',
      fontFamily: 'sans-serif',
    }}
  >
    {children}
  </div>
)

const LoadingFrame = (message: string) => (
  <FrameImage>
    <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>{message}</h2>
    <p style={{ fontSize: '24px' }}>This may take a moment. Click the button below to check the status.</p>
  </FrameImage>
);

// Modify the pendingOperations type
const pendingOperations = new Map<string, { promise: Promise<any>, completed: boolean }>();

app.frame('/', (c) => {
  return c.res({
    image: (
      <FrameImage>
        <h1 style={{ fontSize: '64px', marginBottom: '24px' }}>Livepeer AI Frame</h1>
        <p style={{ fontSize: '32px' }}>Enter a prompt to generate or transform an image</p>
      </FrameImage>
    ),
    intents: [
      <TextInput placeholder="Enter image prompt..." />,
      <Button action="/generate">Generate Image</Button>,
    ],
  })
})

app.frame('/generate', async (c) => {
  const prompt = c.inputText
  if (!prompt) {
    return c.res({
      image: (
        <FrameImage>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Please enter a prompt to generate an image.</h2>
        </FrameImage>
      ),
      intents: [<Button action="/">Back</Button>],
    })
  }

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
      console.log(`Attempt ${attempt}: Sending request with:`, { prompt });
    const response = await fetch('https://dream-gateway.livepeer.cloud/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LIVEPEER_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model_id: "SG161222/RealVisXL_V4.0_Lightning",
        width: 1024,
        height: 1024,
        safety_check: true
      }),
    })

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error (Attempt ${attempt}/${maxRetries}):`, response.status, errorText);
        if (response.status === 503) {
          console.log("Service Unavailable. Retrying...");
          await delay(2000 * attempt); // Exponential backoff
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json() as { images: { url: string, nsfw: boolean }[] };
    
    if (result.images[0].nsfw) {
      return c.res({
        image: (
          <FrameImage>
            <h2 style={{ fontSize: '36px', color: '#ef4444', marginBottom: '20px' }}>NSFW content detected</h2>
            <p style={{ fontSize: '24px' }}>Please try a different prompt.</p>
          </FrameImage>
        ),
        intents: [<Button action="/">Try Again</Button>],
      })
    }

    const imageUrl = result.images[0].url

    return c.res({
      image: imageUrl,
      intents: [
        <Button action="/">Anotha One ⚡️</Button>,
        <Button action="/transform" value={imageUrl}>Transform 🔥</Button>,
        <Button action="/image-to-video" value={imageUrl}>Video 🎥</Button>,
        <Button.Link href={imageUrl}>↗️ View Image 🖼️</Button.Link>,
      ],
    })
  } catch (error) {
      console.error(`Error generating image (Attempt ${attempt}/${maxRetries}):`, error)
      if (attempt === maxRetries) {
    return c.res({
      image: (
        <FrameImage>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Error generating image. Please try again.</h2>
          <p style={{ fontSize: '24px' }}>{error instanceof Error ? error.message : 'Unknown error'}</p>
        </FrameImage>
      ),
      intents: [<Button action="/">Try Again</Button>],
    })
  }
      await delay(2000 * attempt); // Exponential backoff
    }
  }

  // Add a fallback return statement
  return c.res({
    image: (
      <FrameImage>
        <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Failed to generate image after multiple attempts.</h2>
        <p style={{ fontSize: '24px' }}>The service might be temporarily unavailable. Please try again later.</p>
      </FrameImage>
    ),
    intents: [<Button action="/">Try Again</Button>],
  })
})

app.frame('/transform', async (c) => {
  const imageUrl = c.buttonValue
  if (!imageUrl) {
    return c.res({
      image: (
        <FrameImage>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>No image provided for transformation.</h2>
        </FrameImage>
      ),
      intents: [<Button action="/">Back to Start</Button>],
    })
  }

  return c.res({
    image: imageUrl,
    intents: [
      <TextInput placeholder="Enter transformation prompt..." />,
      <Button action="/do-transform" value={imageUrl}>Transform 🔥</Button>,
      <Button action="/">Cancel ❌</Button>,
    ],
  })
})

app.frame('/do-transform', async (c) => {
  const imageUrl = c.previousButtonValues?.[0]
  const prompt = c.inputText
  if (!imageUrl || !prompt) {
    return c.res({
      image: (
        <FrameImage>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Missing image URL or prompt for transformation.</h2>
        </FrameImage>
      ),
      intents: [<Button action="/">Back to Start</Button>],
    })
  }

  const operationId = `transform_${Date.now()}`
  
  // Start the transformation process
  const operation = transformImage(imageUrl, prompt);
  pendingOperations.set(operationId, { promise: operation, completed: false });

  operation.then(() => {
    const op = pendingOperations.get(operationId);
    if (op) op.completed = true;
  }).catch(() => {
    pendingOperations.delete(operationId);
  });

  return c.res({
    image: LoadingFrame("Transforming Image..."),
    intents: [
      <Button action="/check-transform" value={operationId}>Check Status</Button>,
      <Button action="/">Cancel</Button>,
    ],
  })
})

app.frame('/check-transform', async (c) => {
  const operationId = c.buttonValue as string
  const operation = pendingOperations.get(operationId)

  if (!operation) {
    return c.res({
      image: (
        <FrameImage>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Operation not found. Please try again.</h2>
        </FrameImage>
      ),
      intents: [<Button action="/">Back to Start</Button>],
    })
  }

  // Check if the operation has completed
  if (operation.completed) {
    const result = await operation.promise;
    pendingOperations.delete(operationId);

    return c.res({
      image: result.transformedImageUrl,
      intents: [
        <Button action="/">Generate New Image</Button>,
        <Button action="/transform" value={result.transformedImageUrl}>Anotha One 🔥</Button>,
        <Button action="/image-to-video" value={result.transformedImageUrl}>Video 🎥</Button>,
        <Button.Link href={result.transformedImageUrl}>↗️ View Image 🖼️</Button.Link>,
      ],
    })
  } else {
    // Operation is still pending
    return c.res({
      image: LoadingFrame("Still processing..."),
      intents: [
        <Button action="/check-transform" value={operationId}>Check Again</Button>,
        <Button action="/">Cancel</Button>,
      ],
    })
  }
})

// Add this function to handle the image transformation
async function transformImage(imageUrl: string, prompt: string) {
  const imageResponse = await fetch(imageUrl);
  const imageBlob = await imageResponse.blob();
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('image', imageBlob, 'image.png');
  formData.append('model_id', 'timbrooks/instruct-pix2pix');

  const response = await fetch('https://dream-gateway.livepeer.cloud/image-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LIVEPEER_AI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json() as { images: { url: string }[] };
  return { transformedImageUrl: result.images[0].url };
}

app.frame('/image-to-video', async (c) => {
  const imageUrl = c.buttonValue
  if (!imageUrl) {
    return c.res({
      image: (
        <FrameImage>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>No image provided for video generation.</h2>
        </FrameImage>
      ),
      intents: [<Button action="/">Back to Start</Button>],
    })
  }

  const operationId = `video_${Date.now()}`
  
  // Start the video generation process
  const operation = generateVideo(imageUrl);
  pendingOperations.set(operationId, { promise: operation, completed: false });

  operation.then(() => {
    const op = pendingOperations.get(operationId);
    if (op) op.completed = true;
  }).catch(() => {
    pendingOperations.delete(operationId);
  });

  return c.res({
    image: LoadingFrame("Generating Video..."),
    intents: [
      <Button action="/check-video" value={operationId}>Check Status</Button>,
      <Button action="/">Cancel</Button>,
    ],
  })
})

app.frame('/check-video', async (c) => {
  const operationId = c.buttonValue as string
  const operation = pendingOperations.get(operationId)

  if (!operation) {
    return c.res({
      image: (
        <FrameImage>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Operation not found. Please try again.</h2>
        </FrameImage>
      ),
      intents: [<Button action="/">Back to Start</Button>],
    })
  }

  // Check if the operation has completed
  if (operation.completed) {
    const result = await operation.promise;
    pendingOperations.delete(operationId);

    return c.res({
      image: (
        <FrameImage>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>Video Generated Successfully!</h2>
        </FrameImage>
      ),
      intents: [
        <Button action="/">Generate New Image</Button>,
        <Button action="/image-to-video" value={result.imageUrl}>Generate Another Video</Button>,
        <Button.Link href={result.videoUrl}>↗️ View Video</Button.Link>,
      ],
    })
  } else {
    // Operation is still pending
    return c.res({
      image: LoadingFrame("Still processing..."),
      intents: [
        <Button action="/check-video" value={operationId}>Check Again</Button>,
        <Button action="/">Cancel</Button>,
      ],
    })
  }
})

// Add this function to handle the video generation
async function generateVideo(imageUrl: string) {
  const imageResponse = await fetch(imageUrl);
  const imageBlob = await imageResponse.blob();
  const formData = new FormData();
  formData.append('image', imageBlob, 'image.png');
  formData.append('model_id', 'stabilityai/stable-video-diffusion-img2vid-xt-1-1');

  const response = await fetch('https://dream-gateway.livepeer.cloud/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LIVEPEER_AI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json() as { images: { url: string }[] };
  return { videoUrl: result.images[0].url, imageUrl };
}

if (process.env.NODE_ENV === 'development') {
  devtools(app, { serveStatic })
}

export const GET = handle(app)
export const POST = handle(app)
// NOTE: That if you are using the devtools and enable Edge Runtime, you will need to copy the devtools
// static assets to the public folder. You can do this by adding a script to your package.json:
// ```json
// {
//   scripts: {
//     "copy-static": "cp -r ./node_modules/frog/_lib/ui/.frog ./public/.frog"
//   }
// }
// ```
// Next, you'll want to set up the devtools to use the correct assets path:
// ```ts
// devtools(app, { assetsPath: '/.frog' })
// ```






