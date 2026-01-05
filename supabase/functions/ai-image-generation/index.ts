import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Endpoints para geração de imagens
const IMAGE_API_URL = 'https://image.chutes.ai/generate';
// Qwen Image Edit - endpoint dedicado para edição/transformação de imagens
const QWEN_IMAGE_EDIT_URL = 'https://chutes-qwen-image-edit-2509.chutes.ai/generate';

// Endpoints dedicados (URL própria)
const DEDICATED_ENDPOINTS: Record<string, string> = {
  'z-image-turbo': 'https://chutes-z-image-turbo.chutes.ai/generate',
  'hidream': 'https://chutes-hidream.chutes.ai/generate',
  'hunyuan': 'https://chutes-hunyuan-image-3.chutes.ai/generate',
};

// Lista de modelos de imagem disponíveis
interface ImageModelConfig {
  name: string;          // Nome amigável
  model: string;         // ID do modelo para API (ou 'dedicated' para endpoints dedicados)
  description: string;   // Descrição curta
  category: 'fast' | 'quality' | 'artistic';  // Categoria para organização
  defaultSteps?: number; // Steps recomendados
  dedicatedEndpoint?: boolean; // Se usa endpoint dedicado (URL própria)
  noGuidance?: boolean;  // Se o modelo não usa guidance_scale (modelos distilados como Z-Image Turbo)
  noNegativePrompt?: boolean; // Se o modelo não suporta negative_prompt
  useResolution?: boolean; // Se usa 'resolution' como string em vez de width/height (HiDream)
  useSize?: boolean; // Se usa 'size' como string em vez de width/height (Hunyuan)
  useStepsParam?: boolean; // Se usa 'steps' em vez de 'num_inference_steps' (Hunyuan)
  useImageSizeObject?: boolean; // Se usa 'image_size' como objeto {width, height}
  minimalParams?: boolean; // Se aceita apenas parâmetros mínimos (prompt, width, height, seed)
}

const IMAGE_MODELS: Record<string, ImageModelConfig> = {
  // === Modelos com Endpoint Dedicado ===
  'z-image-turbo': {
    name: 'Z-Image Turbo',
    model: 'dedicated',
    description: 'Ultra rápido, alta qualidade',
    category: 'fast',
    defaultSteps: 8, // Z-Image Turbo usa 1-8 steps (8 para melhor qualidade)
    dedicatedEndpoint: true,
    noGuidance: true, // Z-Image Turbo não usa guidance_scale (modelo distilado)
    noNegativePrompt: true, // Z-Image Turbo não suporta negative_prompt
    minimalParams: true, // Z-Image Turbo aceita apenas prompt, width, height, seed
  },
  'hidream': {
    name: 'HiDream',
    model: 'dedicated',
    description: 'Sonhos e fantasia',
    category: 'artistic',
    defaultSteps: 50,
    dedicatedEndpoint: true,
    useResolution: true, // HiDream usa 'resolution' como string (ex: "1024x1024")
  },
  'hunyuan': {
    name: 'Hunyuan Image 3',
    model: 'dedicated',
    description: 'Tencent, máxima qualidade',
    category: 'quality',
    defaultSteps: 50, // Hunyuan default é 50
    dedicatedEndpoint: true,
    useSize: true, // Hunyuan usa 'size' como string (ex: "1280x768" ou "16:9")
    useStepsParam: true, // Hunyuan usa 'steps' em vez de 'num_inference_steps'
  },

  // === Modelos via Endpoint Unificado ===
  'flux-schnell': {
    name: 'FLUX.1 Schnell',
    model: 'FLUX.1-schnell',
    description: 'Ultra rápido (~2s)',
    category: 'fast',
    defaultSteps: 4,
  },
  'juggernaut-xl': {
    name: 'Juggernaut XL',
    model: 'JuggernautXL',
    description: 'Logos, detalhes precisos',
    category: 'quality',
    defaultSteps: 30,
  },
  'juggernaut-ragnarok': {
    name: 'Juggernaut Ragnarok',
    model: 'JuggernautXL-Ragnarok',
    description: 'Logos épicos, alta definição',
    category: 'quality',
    defaultSteps: 30,
  },
  'dreamshaper': {
    name: 'DreamShaper XL',
    model: 'Lykon/dreamshaper-xl-1-0',
    description: 'Arte e ilustração',
    category: 'artistic',
    defaultSteps: 30,
  },
  'sdxl': {
    name: 'Stable Diffusion XL',
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    description: 'Base SDXL oficial',
    category: 'quality',
    defaultSteps: 30,
  },
  'chroma': {
    name: 'Chroma',
    model: 'chroma',
    description: 'Cores vibrantes',
    category: 'artistic',
    defaultSteps: 30,
  },
  'illustrious': {
    name: 'Illustrij',
    model: 'Illustrij',
    description: 'Ilustrações artísticas',
    category: 'artistic',
    defaultSteps: 30,
  },
};

// Default model
const DEFAULT_MODEL_ID = 'flux-schnell';
const CHUTES_API_KEY = Deno.env.get('CHUTES_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TextToImageRequest {
  mode: 'text-to-image';
  conversation_id: string;
  workspace_id: string;
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
  seed?: number;
  style?: string;
  model_id?: string;
  model_endpoint?: string;
}

interface ImageToImageRequest {
  mode: 'image-to-image';
  conversation_id: string;
  workspace_id: string;
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
  seed?: number;
  strength?: number;
  reference_image_base64?: string;
  reference_image_type?: string;
  model_id?: string;
  model_endpoint?: string;
}

type ImageGenerationRequest = TextToImageRequest | ImageToImageRequest;

// Presets de estilo
const STYLE_PRESETS: Record<string, { guidance_scale: number; negative_prompt_suffix: string; prompt_prefix?: string }> = {
  logo: {
    guidance_scale: 9.0,
    negative_prompt_suffix: 'gradient background, complex background, photo, photograph, realistic, shadows, 3d, noise, grain, busy background, colorful background, texture background, pattern background, detailed background',
    prompt_prefix: 'minimalist logo design, clean white background, vector style, sharp clean lines, high contrast, simple geometric shapes, professional logo, flat design, crisp edges, scalable vector graphics style, centered composition, '
  },
  realistic: { guidance_scale: 7.5, negative_prompt_suffix: 'cartoon, anime, illustration, drawing' },
  photography: { guidance_scale: 8.0, negative_prompt_suffix: 'drawing, painting, art, illustration' },
  digital_art: {
    guidance_scale: 8.5,
    negative_prompt_suffix: 'simple, flat, minimal, plain background, amateur, low detail, boring composition, empty space, basic, ugly, deformed, disfigured, poorly drawn, cluttered, messy, unbalanced',
    prompt_prefix: `professional Brazilian social media post design, ultra detailed premium marketing visual, Instagram-worthy advertisement,

=== COLOR PALETTE AND VIBRANCY ===
- electric neon colors: hot pink, electric blue, lime green, vivid orange
- duotone and tritone gradient combinations
- complementary color schemes with high contrast
- saturated vibrant hues with occasional muted accents
- color temperature contrast (warm vs cool areas)

=== BACKGROUND COMPOSITION ===
- vibrant colorful gradient background with multiple color transitions
- geometric shapes: rotated squares at 45 degrees with low opacity, gradient fill, or outline only
- abstract decorative shapes: circles, triangles, hexagons, pentagons with transparency
- layered geometric patterns creating visual depth
- diagonal lines, stripes, and wave patterns as decorative elements
- halftone dot patterns and comic-style textures
- curved wave lines and organic flowing shapes

=== LIGHTING AND EFFECTS ===
- dramatic volumetric lighting with visible light rays and god rays
- lens flare effects and cinematic light leaks
- soft ambient glow and halo around main elements
- rim lighting and backlighting on 3D objects
- neon glow accents with color bleeding
- subtle film grain texture overlay for premium feel
- chromatic aberration on edges for stylized look
- spotlight effects highlighting focal points

=== BLUR EFFECTS (variety) ===
- motion blur on floating elements showing movement direction
- radial blur emanating from center focal point
- gaussian blur on background layers for depth of field
- directional speed blur on dynamic objects creating sense of motion
- bokeh lights with soft circular blur in background
- tilt-shift blur effect for miniature/toy look
- zoom blur radiating from center
- selective focus with sharp subject and blurred surroundings

=== DEPTH AND DIMENSION ===
- 3D realistic objects floating with realistic cast shadows
- glass morphism panels with frosted transparency and blur
- multiple depth layers creating parallax effect
- objects breaking out of frames and boundaries (frame break)
- drop shadows with soft edges and ambient occlusion
- reflection and refraction on glossy/glass surfaces
- isometric perspective on products and objects
- z-depth layering with foreground, midground, background

=== 3D ELEMENTS AND OBJECTS ===
- floating 3D coins and money (for promos)
- 3D emojis with realistic rendering
- 3D social media icons (hearts, likes, comments)
- products in dynamic floating positions
- 3D typography with metallic or glossy finish
- floating geometric primitives (spheres, cubes, pyramids)
- 3D ribbons and banners

=== ATMOSPHERIC ELEMENTS ===
- soft clouds and ethereal smoke wisps
- particle effects: sparkles, glitter, stars
- dust motes floating in light beams
- water droplets, splashes, or condensation
- energy waves and aura effects
- confetti explosions and celebration elements
- floating petals or leaves

=== TEXTURES AND PATTERNS ===
- halftone dots pattern overlay
- speed lines (manga/comic style)
- subtle paper or noise texture
- wave and curve patterns
- grid and mesh overlays with transparency
- brushstroke textures
- metallic and chrome surfaces

=== DYNAMIC ELEMENTS ===
- splash effects and liquid splashes
- explosion bursts and starburst shapes
- swooshes, swirls, and dynamic ribbons
- directional arrows with stylized design
- energy trails and motion paths
- comic-style impact effects
- circular badge and seal elements

=== UI/UX SOCIAL MEDIA ELEMENTS ===
- floating discount badges and sale tags
- price tags with special design
- call-to-action buttons (stylized)
- promotional seals and stamps
- countdown timer elements
- rating stars and review badges
- "NEW" and "HOT" label badges

=== TYPOGRAPHY STYLE ===
- bold text with outline only, no fill, overlapping scene elements
- text with thick stroke border in contrasting color
- 3D extruded text with shadows and depth
- text integrated and interacting with scene elements
- gradient fill on typography
- glowing text with neon effect
- text with perspective and rotation

=== COMPOSITION PRINCIPLES ===
- rule of thirds with clear focal point
- dynamic asymmetric balance
- clear space reserved for text/logo placement
- visual flow guiding eye through design
- frame-within-frame compositions
- diagonal dynamic compositions
- strong visual hierarchy with size contrast

=== BORDER AND EDGE EFFECTS ===
- gradient borders transitioning between colors
- double and triple outline effects
- glowing edges with neon color bleeding
- irregular organic borders and torn edges
- decorative corner elements and flourishes
- dashed and dotted border styles
- border with shadow for lifted effect

=== MATERIALS AND SURFACES ===
- holographic iridescent surfaces with rainbow reflections
- metallic finishes: gold, silver, rose gold, copper, bronze
- glossy plastic and vinyl textures
- matte velvet premium surfaces
- liquid and fluid organic shapes
- crystal and diamond faceted surfaces
- brushed metal and steel textures
- pearlescent and opalescent materials

=== ADVANCED SHADOW TECHNIQUES ===
- long shadows at 45 degree angles
- colored shadows matching brand colors
- inner shadows for depth and recess
- multi-layer shadows with different opacities
- contact shadows grounding objects
- ambient occlusion for realistic depth
- hard and soft shadow combinations
- shadow gradients fading to transparency

=== ADVANCED TEXT EFFECTS ===
- text with image mask/clipping mask
- cutout text revealing background
- text with colored drop shadow
- wavy and distorted text paths
- text following curved paths
- embossed and debossed text
- text with inner texture fill
- knockout text with transparency

=== SEASONAL AND THEMATIC ELEMENTS ===
- celebration elements: fireworks, sparklers, party poppers
- urgency indicators: countdown timers, limited time badges
- scarcity elements: "only X left", "selling fast" labels
- seasonal decorations: snowflakes, leaves, flowers, hearts
- achievement badges and trophy icons
- fire and flame effects for hot deals
- lightning bolts for flash sales
- crown and VIP elements for premium

=== ADVANCED LIGHTING TECHNIQUES ===
- two-point lighting with key and fill
- butterfly lighting for glamour shots
- split lighting for dramatic effect
- backlight silhouette effects
- rim light outlining subjects
- colored gel lighting effects
- caustic light patterns from water/glass
- studio lighting setups recreated

=== MICRO-DETAILS AND OVERLAYS ===
- subtle film grain for cinematic feel
- vintage scratches and dust overlay
- light leak overlays in corners
- vignette darkening edges
- scan lines for retro effect
- glitch and digital noise effects
- paper texture overlay
- fabric and canvas textures

=== LIQUID AND FLUID ELEMENTS ===
- paint splashes and drips
- water splashes and droplets
- milk and cream pours
- honey and syrup drizzles
- metallic liquid gold/silver
- ink drops and diffusion
- bubble and foam effects
- melting and dripping effects

=== DECORATIVE FRAMES AND CONTAINERS ===
- polaroid and photo frame styles
- mobile phone and device mockups
- TV and monitor screen frames
- speech bubbles and thought clouds
- decorative borders and ornaments
- stamp and postage styles
- ticket and coupon designs
- certificate and award frames

=== POST TYPES AND FORMATS ===

--- INSTAGRAM FEED POST (1:1, 1080x1080) ---
- square format optimized for grid aesthetic
- eye-catching thumbnail that works at small size
- clear focal point visible in feed preview
- brand colors and consistent visual identity
- space for caption text overlay if needed
- works both standalone and in grid mosaic

--- INSTAGRAM CAROUSEL POST (1:1, 1080x1080 per slide) ---
- cohesive visual story across multiple slides
- swipe indicator and navigation cues
- consistent design language between slides
- first slide as attention-grabbing hook
- progression of information slide by slide
- final slide with call-to-action

--- INSTAGRAM STORIES (9:16, 1080x1920) ---
- vertical full-screen immersive format
- interactive elements area (polls, questions, links)
- safe zones avoiding top/bottom UI elements
- bold text readable on small screens
- swipe-up call-to-action area at bottom
- quick consumption visual hierarchy

--- INSTAGRAM REELS COVER (9:16, 1080x1920) ---
- thumbnail optimized for Reels grid
- central focus point visible in cropped preview
- text overlay in middle safe zone
- vibrant colors that pop in feed
- clear subject matter at glance

--- FACEBOOK AD (various ratios) ---
- attention-grabbing in crowded feed
- minimal text (20% rule awareness)
- clear value proposition visible
- brand recognition elements
- scroll-stopping visual hook
- optimized for mobile-first viewing

--- E-COMMERCE BANNER (wide formats) ---
- product showcase with lifestyle context
- price and discount prominently displayed
- urgency elements (limited time, countdown)
- clear call-to-action button area
- brand trust indicators (ratings, reviews)
- mobile-responsive design considerations

--- PRODUCT SHOWCASE POST ---
- hero product in center focus
- multiple angles or variants shown
- feature highlights with callouts
- before/after comparisons
- size reference and scale indicators
- detailed texture and material visibility

--- PROMOTIONAL/SALE POST ---
- bold percentage off or discount amount
- original vs sale price comparison
- urgency countdown or limited quantity
- product bundle arrangements
- seasonal sale theming
- stacking offers visual hierarchy

--- TESTIMONIAL/REVIEW POST ---
- customer photo or avatar integration
- quote typography treatment
- star rating visualization
- before/after transformation
- social proof indicators
- authentic and relatable styling

--- YOUTUBE THUMBNAIL (16:9, 1280x720) ---
- high contrast and saturation for visibility
- expressive face or reaction
- bold readable text (3-5 words max)
- curiosity gap or question hook
- brand consistency with channel
- works at small sidebar size

--- LINKEDIN POST (various, prefer 1200x627) ---
- professional and polished aesthetic
- corporate color schemes
- data visualization and infographics
- thought leadership positioning
- clean minimalist approach
- business-appropriate imagery

--- TWITTER/X POST (16:9 or 1:1) ---
- works with text tweet above
- meme-friendly and shareable format
- quick visual communication
- thread-compatible design
- viral potential composition
- bold statements and quotes

--- WHATSAPP STATUS (9:16, 1080x1920) ---
- vertical format for mobile
- personal and casual tone
- quick message delivery
- contact-friendly design
- shareable to conversations
- works on various backgrounds

--- PINTEREST PIN (2:3, 1000x1500) ---
- vertical tall format for feed
- step-by-step visual guides
- infographic style layouts
- recipe and DIY friendly
- save-worthy aesthetic
- text overlay at top or bottom

--- EMAIL HEADER BANNER (600x200 to 600x400) ---
- email-safe colors
- works with/without images loaded
- clear hierarchy in constrained space
- mobile email client optimized
- brand header consistency
- click-through visual cues

--- WEBSITE HERO BANNER (various wide formats) ---
- full-width responsive design
- text overlay safe areas
- parallax-ready layering
- above-the-fold impact
- navigation-friendly spacing
- fast-loading optimization awareness

--- PODCAST COVER ART (1:1, 3000x3000) ---
- readable at small sizes (100x100)
- distinctive at glance in directories
- consistent series branding
- episode number integration
- guest photo placement
- audio-themed visual elements

--- EVENT ANNOUNCEMENT POST ---
- date, time, location prominent
- event atmosphere preview
- speaker or performer showcase
- ticket/registration CTA
- countdown to event
- shareable event details

--- INFOGRAPHIC POST ---
- data visualization charts
- step-by-step process flows
- comparison tables
- statistics highlights
- icon-based explanations
- scannable information hierarchy

rich visual hierarchy, dynamic asymmetric composition, professional marketing quality, trending on Behance and Dribbble, award-winning social media design, `
  },
  anime: { guidance_scale: 7.0, negative_prompt_suffix: 'realistic, photo, photograph' },
  painting: { guidance_scale: 6.0, negative_prompt_suffix: 'photo, 3d render, photograph' },
  '3d_render': { guidance_scale: 7.5, negative_prompt_suffix: '2d, flat, drawing, sketch' },
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate API key
    if (!CHUTES_API_KEY) {
      throw new Error('CHUTES_API_KEY not configured');
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ImageGenerationRequest = await req.json();

    const {
      mode,
      conversation_id,
      workspace_id,
      prompt,
      negative_prompt = '',
      width = 1024,
      height = 1024,
      guidance_scale,
      num_inference_steps = 30,
      seed,
      style,
      model_id,
      model_endpoint,
    } = body;

    // Determinar qual modelo usar
    const selectedModelId = model_id || DEFAULT_MODEL_ID;
    const modelConfig = IMAGE_MODELS[selectedModelId] || IMAGE_MODELS[DEFAULT_MODEL_ID];
    const modelName = modelConfig.model;
    const modelFriendlyName = modelConfig.name;

    // Validate required fields
    if (!conversation_id || !workspace_id || !prompt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: conversation_id, workspace_id, prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate dimensions (API suporta 128-2048)
    if (width < 128 || width > 2048 || height < 128 || height > 2048) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dimensions must be between 128 and 2048' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply style preset
    let finalGuidanceScale = guidance_scale ?? 7.5;
    let finalNegativePrompt = negative_prompt;
    let finalPrompt = prompt;

    if (style && STYLE_PRESETS[style]) {
      const preset = STYLE_PRESETS[style];
      finalGuidanceScale = guidance_scale ?? preset.guidance_scale;
      finalNegativePrompt = negative_prompt
        ? `${negative_prompt}, ${preset.negative_prompt_suffix}`
        : preset.negative_prompt_suffix;
      // Apply prompt prefix if exists (for logo style, etc)
      if (preset.prompt_prefix) {
        finalPrompt = preset.prompt_prefix + prompt;
      }
    }

    // Add base quality negative prompt (remove 'text' for logo style since logos may have text)
    const baseNegative = style === 'logo'
      ? 'blur, blurry, low quality, distortion, watermark'
      : 'blur, blurry, low quality, distortion, watermark, text';
    finalNegativePrompt = finalNegativePrompt
      ? `${finalNegativePrompt}, ${baseNegative}`
      : baseNegative;

    console.log(`[ai-image-generation] Mode: ${mode}, Model: ${modelFriendlyName} (${modelName})`);
    console.log(`[ai-image-generation] Prompt: "${prompt.slice(0, 50)}..."`);

    let imageBuffer: ArrayBuffer;
    const startTime = Date.now();

    if (mode === 'image-to-image') {
      // Image-to-Image generation via Qwen Image Edit API
      // Endpoint: https://chutes-qwen-image-edit-2509.chutes.ai/generate
      // Este endpoint suporta edição/transformação de imagens existentes

      console.log(`[ai-image-generation] Entering img2img branch, will use Qwen Image Edit API`);

      const img2imgBody = body as ImageToImageRequest;

      if (!img2imgBody.reference_image_base64) {
        console.error(`[ai-image-generation] Missing reference_image_base64`);
        return new Response(
          JSON.stringify({ success: false, error: 'reference_image_base64 is required for image-to-image mode' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log do tamanho da imagem base64 para debug
      const base64Size = img2imgBody.reference_image_base64.length;
      console.log(`[ai-image-generation] Reference image base64 size: ${(base64Size / 1024 / 1024).toFixed(2)} MB`);

      // Limitar tamanho da imagem para img2img (Qwen tem melhor performance em 1024x1024)
      const img2imgWidth = Math.min(width, 1024);
      const img2imgHeight = Math.min(height, 1024);

      // Calcular steps baseado na strength (mais strength = mais transformação = mais steps)
      const strength = img2imgBody.strength ?? 0.7;
      // Qwen requer steps entre 20-50 para bons resultados
      const qwenSteps = Math.max(30, Math.min(50, Math.round(num_inference_steps * (1 + strength * 0.5))));

      // true_cfg_scale: controla o quanto seguir o prompt (padrão 4, range 1-10)
      // Strength alta = mais aderência ao prompt, então aumentamos cfg_scale
      const trueCfgScale = Math.max(3, Math.min(8, 4 + (strength * 4)));

      // Qwen espera image_b64s como array de strings base64
      const img2imgRequestBody = {
        prompt: finalPrompt,
        negative_prompt: finalNegativePrompt || '',
        image_b64s: [img2imgBody.reference_image_base64], // Array de imagens base64
        width: img2imgWidth,
        height: img2imgHeight,
        true_cfg_scale: trueCfgScale,
        num_inference_steps: qwenSteps,
        seed: seed !== undefined ? seed : null,
      };

      console.log(`[ai-image-generation] Calling Qwen Image Edit API at: ${QWEN_IMAGE_EDIT_URL}`);
      console.log(`[ai-image-generation] Strength: ${strength}, true_cfg_scale: ${trueCfgScale}, steps: ${qwenSteps}`);
      console.log(`[ai-image-generation] Size: ${img2imgWidth}x${img2imgHeight} (original requested: ${width}x${height})`);

      try {
        console.log(`[ai-image-generation] Sending request to Qwen API...`);
        const fetchStartTime = Date.now();

        const response = await fetch(QWEN_IMAGE_EDIT_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CHUTES_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(img2imgRequestBody),
        });

        const fetchDuration = Date.now() - fetchStartTime;
        console.log(`[ai-image-generation] Qwen API response received in ${fetchDuration}ms, status: ${response.status}`);

        // Log response headers para debug
        const contentType = response.headers.get('content-type');
        console.log(`[ai-image-generation] Response content-type: ${contentType}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[ai-image-generation] Qwen API error: ${response.status} - ${errorText}`);
          throw new Error(`Qwen Image Edit API error: ${response.status} - ${errorText}`);
        }

        // Verificar se a resposta é JSON (pode conter URL da imagem) ou binário
        if (contentType?.includes('application/json')) {
          // A API pode retornar JSON com a imagem em base64 ou URL
          const jsonResponse = await response.json();
          console.log(`[ai-image-generation] Qwen API returned JSON response:`, JSON.stringify(jsonResponse).slice(0, 500));

          // Tentar extrair a imagem do JSON
          if (jsonResponse.image_b64) {
            // Se retornar base64, converter para ArrayBuffer
            const binaryString = atob(jsonResponse.image_b64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            imageBuffer = bytes.buffer;
            console.log(`[ai-image-generation] Extracted image from JSON base64, size: ${imageBuffer.byteLength} bytes`);
          } else if (jsonResponse.images && jsonResponse.images[0]) {
            // Formato alternativo: array de imagens base64
            const binaryString = atob(jsonResponse.images[0]);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            imageBuffer = bytes.buffer;
            console.log(`[ai-image-generation] Extracted image from JSON images array, size: ${imageBuffer.byteLength} bytes`);
          } else if (jsonResponse.url) {
            // Se retornar URL, fazer fetch da imagem
            console.log(`[ai-image-generation] Fetching image from URL: ${jsonResponse.url}`);
            const imageResponse = await fetch(jsonResponse.url);
            imageBuffer = await imageResponse.arrayBuffer();
            console.log(`[ai-image-generation] Downloaded image from URL, size: ${imageBuffer.byteLength} bytes`);
          } else {
            console.error(`[ai-image-generation] Unexpected JSON response structure:`, jsonResponse);
            throw new Error('Qwen API returned unexpected JSON structure');
          }
        } else {
          // Resposta binária direta (imagem)
          imageBuffer = await response.arrayBuffer();
          console.log(`[ai-image-generation] Qwen API returned binary image, size: ${imageBuffer.byteLength} bytes`);
        }
      } catch (fetchError) {
        console.error(`[ai-image-generation] Fetch error calling Qwen API:`, fetchError);
        throw fetchError;
      }
    } else {
      // Text-to-Image generation
      // Determinar endpoint e body baseado no tipo de modelo
      const isDedicatedEndpoint = modelConfig.dedicatedEndpoint === true;
      const apiEndpoint = isDedicatedEndpoint
        ? DEDICATED_ENDPOINTS[selectedModelId]
        : IMAGE_API_URL;

      // Para endpoints dedicados, não incluir 'model' no body
      // Para modelos distilados (noGuidance), não incluir guidance_scale
      // Para modelos sem suporte (noNegativePrompt), não incluir negative_prompt
      let generateBody: Record<string, unknown>;

      if (isDedicatedEndpoint) {
        // Endpoint dedicado - construir body específico para cada modelo

        if (modelConfig.minimalParams) {
          // Z-Image Turbo - aceita APENAS prompt
          // Sanitizar prompt de forma muito agressiva: apenas ASCII básico
          const sanitizedPrompt = finalPrompt
            // Remover caracteres não-ASCII (emojis, caracteres especiais Unicode)
            .replace(/[^\x20-\x7E]/g, ' ')
            // Normalizar espaços múltiplos
            .replace(/\s+/g, ' ')
            .trim()
            // Limitar a 200 caracteres para teste
            .slice(0, 200);

          // Se após sanitização o prompt ficar muito curto, usar um fallback
          const finalSanitizedPrompt = sanitizedPrompt.length >= 10
            ? sanitizedPrompt
            : 'A beautiful high quality photo';

          generateBody = {
            prompt: finalSanitizedPrompt,
          };

          console.log(`[ai-image-generation] Z-Image Turbo FINAL prompt: "${finalSanitizedPrompt}"`);
          console.log(`[ai-image-generation] Z-Image Turbo prompt length: ${finalSanitizedPrompt.length}`);
        } else {
          // Outros endpoints dedicados
          generateBody = {
            prompt: finalPrompt,
            ...(seed !== undefined && { seed }),
          };

          // Configurar dimensões baseado no tipo de parâmetro que o modelo aceita
          if (modelConfig.useResolution) {
            // HiDream usa 'resolution' como string (ex: "1024x1024")
            generateBody.resolution = `${width}x${height}`;
          } else if (modelConfig.useSize) {
            // Hunyuan usa 'size' como string (ex: "1280x768")
            generateBody.size = `${width}x${height}`;
          } else if (modelConfig.useImageSizeObject) {
            // Usa 'image_size' como objeto {width, height}
            generateBody.image_size = { width, height };
          } else {
            // Outros usam width/height separados
            generateBody.width = width;
            generateBody.height = height;
          }

          // Configurar steps baseado no tipo de parâmetro
          if (modelConfig.useStepsParam) {
            // Hunyuan usa 'steps'
            generateBody.steps = modelConfig.defaultSteps || num_inference_steps;
          } else {
            // HiDream e outros usam 'num_inference_steps'
            generateBody.num_inference_steps = modelConfig.defaultSteps || num_inference_steps;
          }

          // Adicionar guidance_scale apenas se o modelo suportar
          if (!modelConfig.noGuidance) {
            generateBody.guidance_scale = finalGuidanceScale;
          }

          // Adicionar negative_prompt apenas se o modelo suportar
          if (!modelConfig.noNegativePrompt && finalNegativePrompt) {
            generateBody.negative_prompt = finalNegativePrompt;
          }
        }
      } else {
        // Endpoint unificado - todos os parâmetros
        generateBody = {
          model: modelName,
          prompt: finalPrompt,
          negative_prompt: finalNegativePrompt,
          guidance_scale: finalGuidanceScale,
          width,
          height,
          num_inference_steps,
          ...(seed !== undefined && { seed }),
        };
      }

      console.log(`[ai-image-generation] Calling ${isDedicatedEndpoint ? 'dedicated' : 'unified'} API: ${apiEndpoint}`);
      console.log(`[ai-image-generation] Size: ${width}x${height}, Model: ${modelFriendlyName}`);
      console.log(`[ai-image-generation] Request body:`, JSON.stringify(generateBody).slice(0, 500));

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CHUTES_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ai-image-generation] Chutes API error: ${response.status} - ${errorText}`);
        throw new Error(`Chutes API error: ${response.status}`);
      }

      imageBuffer = await response.arrayBuffer();
    }

    const generationTime = Date.now() - startTime;
    console.log(`[ai-image-generation] Image generated in ${generationTime}ms`);

    // Upload to Supabase Storage
    const fileName = `generated_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    const storagePath = `${workspace_id}/ai-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ai-assistant-media')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[ai-image-generation] Storage upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('ai-assistant-media')
      .getPublicUrl(storagePath);

    const imageUrl = urlData.publicUrl;
    console.log(`[ai-image-generation] Image uploaded: ${imageUrl}`);

    // Dados de geração para armazenar
    const imageGenerationData = {
      mode,
      prompt,
      negative_prompt: finalNegativePrompt,
      style: style || null,
      width,
      height,
      guidance_scale: finalGuidanceScale,
      num_inference_steps,
      seed: seed || null,
      strength: mode === 'image-to-image' ? (body as ImageToImageRequest).strength ?? 0.7 : null,
      generation_time_ms: generationTime,
      model_id: selectedModelId,
      model: modelName,
      model_name: modelFriendlyName,
    };

    // 1. Create USER message with request configs (visually shows what was requested)
    const userMessageContent = mode === 'image-to-image'
      ? `🎨 Transformar imagem: "${prompt}"`
      : `🎨 Gerar imagem: "${prompt}"`;

    const { error: userMessageError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id,
        role: 'user',
        content: userMessageContent,
        // Armazena as configs na mensagem do usuário também para referência
        image_generation_data: imageGenerationData,
        tokens_used: 0,
      });

    if (userMessageError) {
      console.error('[ai-image-generation] User message insert error:', userMessageError);
      // Não falha, continua para criar a mensagem do assistente
    }

    // 2. Create ASSISTANT message with the generated image
    const { data: message, error: messageError } = await supabase
      .from('ai_messages')
      .insert({
        conversation_id,
        role: 'assistant',
        content: '', // Sem texto, apenas imagem
        media_url: imageUrl,
        content_type: 'image',
        image_generation_data: imageGenerationData,
        tokens_used: 0,
      })
      .select()
      .single();

    if (messageError) {
      console.error('[ai-image-generation] Message insert error:', messageError);
      throw new Error(`Failed to save message: ${messageError.message}`);
    }

    // Update conversation timestamp
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation_id);

    return new Response(
      JSON.stringify({
        success: true,
        message_id: message.id,
        image_url: imageUrl,
        generation_time_ms: generationTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-image-generation] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
