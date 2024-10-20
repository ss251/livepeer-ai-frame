# Livepeer AI Frame

Livepeer AI Frame is a Farcaster Frame server that brings AI-powered content creation directly into a Farcaster Frame. This project leverages Livepeer's AI technologies to provide a seamless, in-frame experience for generating and transforming images, as well as creating short videos.

Live demo [here](https://warpcast.com/thescoho.eth/0x82bb3ea8) (on Warpcast) 

## Features

- **Text-to-Image Generation**: Create images from text prompts using the SG161222/RealVisXL_V4.0_Lightning model.
- **Image-to-Image Transformation**: Transform existing images based on text prompts using the timbrooks/instruct-pix2pix model.
- **Image-to-Video Conversion**: Generate short videos from static images using the stabilityai/stable-video-diffusion-img2vid-xt-1-1 model.
- **Multi-step Interaction Flow**: Guide users through the content creation process with an intuitive, step-by-step interface.
- **NSFW Content Detection**: Ensure safe and appropriate content generation with built-in NSFW filtering.

## Setup

1. Install dependencies:
   ```
   yarn install
   ```

2. Set up environment variables:
   Create a `.env.local` file in the root directory and add the following:
   ```
   LIVEPEER_AI_API_KEY=your_livepeer_api_key
   NEYNAR_API_KEY=your_neynar_api_key or NEYNAR_FROG_FM
   ```

  Get Livepeer API key from [Livepeer Studio](https://livepeer.studio)
  Get Neynar API key from [Neynar](https://neynar.com)

3. Run the development server:
   ```
   yarn dev
   ```

4. Open [http://localhost:3000/api/dev](http://localhost:3000/api/dev) to access Frog devtools and test frame interactions.

## Usage

1. Deploy the Frame to a hosting platform like Vercel.
2. Validate Frame using a validator like [Warpcast Frame Validator](https://warpcast.com/~/developers/frames)
3. Share the Frame URL in a Farcaster cast.
4. Users can interact with the Frame directly within their Farcaster client:
   - Enter text prompts to generate images
   - Transform the generated image into another image
   - Convert images to short videos

## Technologies Used

- Next.js
- Livepeer AI API
- Neynar API for Farcaster Hub
- Frog for Frame creation
- Frog Devtools for Frame validation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
