# SAJAL BAIDDYA (Rafael) — Personal Portfolio

> A premium, cyberpunk-luxury personal portfolio website built with pure HTML5, CSS3, and Vanilla JavaScript. No frameworks. No dependencies. Just clean, performant code.

![Portfolio Preview](https://sb-sajal.github.io/assets/images/og-image.png)

## 🚀 Features

- **Cyberpunk Luxury Design** — Glassmorphism, neon accents, premium glass cards
- **Animated Loading Screen** — Particles, code snippets, progress counter
- **Custom Cursor** — Neon glow, animated ring, click ripple, hover effects
- **Scroll Progress Bar** — Neon gradient animated progress indicator
- **Typewriter Effect** — Rotating professional titles in hero section
- **Floating Code Snippets** — Animated terminal commands in background
- **Interactive Skills** — Progress bars, circular progress, canvas radar chart
- **Project Showcase** — Filterable cards with 3D tilt effect and glow borders
- **Animated Timeline** — Vertical timeline with scroll-triggered reveals
- **Photo Gallery** — Horizontal slider with lightbox, keyboard & touch support
- **Contact Form** — Frontend validation with animated success message
- **Theme Toggle** — Dark/Light mode with localStorage persistence
- **Sound Effects** — Subtle Web Audio API sounds (hover, click, theme switch)
- **Responsive Design** — Fully responsive from mobile to 4K displays
- **Accessibility** — ARIA labels, keyboard navigation, focus states, reduced motion
- **SEO Optimized** — Meta tags, Open Graph, Twitter Cards, Schema.org JSON-LD
- **Performance** — No dependencies, lazy loading, efficient CSS/JS

## 📁 File Structure

```
portfolio/
├── index.html              # Main portfolio page
├── 404.html                # Custom 404 error page
├── style.css               # Complete stylesheet
├── script.js               # All JavaScript functionality
├── README.md               # This file
└── assets/
    ├── images/
    │   ├── portrait.jpg    # Hero section portrait (replace)
    │   ├── about.jpg       # About section image (replace)
    │   ├── project1.jpg    # Project 1 screenshot (replace)
    │   ├── project2.jpg    # Project 2 screenshot (replace)
    │   ├── project3.jpg    # Project 3 screenshot (replace)
    │   ├── project4.jpg    # Project 4 screenshot (replace)
    │   ├── project5.jpg    # Project 5 screenshot (replace)
    │   ├── gallery1.jpg    # Gallery image 1 (replace)
    │   ├── gallery2.jpg    # Gallery image 2 (replace)
    │   ├── gallery3.jpg    # Gallery image 3 (replace)
    │   ├── gallery4.jpg    # Gallery image 4 (replace)
    │   ├── gallery5.jpg    # Gallery image 5 (replace)
    │   ├── gallery6.jpg    # Gallery image 6 (replace)
    │   └── og-image.png    # Open Graph preview image (replace)
    ├── icons/
    ├── audio/              # Reserved for future audio files
    └── resume/
        └── resume.pdf      # Resume PDF (replace)
```

## 🎨 Customization Guide

### Replace Images
Replace placeholder images in `assets/images/` with your own:
- `portrait.jpg` — Your professional headshot (400×500px recommended)
- `about.jpg` — About section photo (450×550px recommended)
- `project1-5.jpg` — Project screenshots (400×250px recommended)
- `gallery1-6.jpg` — Gallery images (600×400px recommended)

### Update URLs
Search for `your-domain.com` and replace with your actual domain.

### Update Social Links
In `index.html`, replace all `href="#"` in social links with your actual profile URLs:
- Facebook
- Telegram
- WhatsApp
- Email (mailto:)
- X (Twitter)
- GitHub
- LinkedIn

### Update Content
Edit `index.html` to customize:
- About section biography
- Project descriptions and technologies
- Timeline milestones
- Contact information
- Skills percentages

### Resume
Place your resume PDF at `assets/resume/resume.pdf`

## 🚀 Deployment

### W3Schools Spaces (Recommended)
1. Upload all files to your W3Schools Space
2. No additional configuration needed
3. The site works immediately

### GitHub Pages
1. Push to a GitHub repository
2. Go to Settings → Pages
3. Select your branch and folder
4. Your site will be live at `https://username.github.io/repo`

### Netlify / Vercel
1. Connect your repository
2. Deploy with default settings
3. No build step required

## 📄 SEO Configuration

### robots.txt
Create a `robots.txt` file in the root directory:

```
User-agent: *
Allow: /
Disallow: /404.html

Sitemap: https://sb-sajal.github.io/sitemap.xml
```

### sitemap.xml
Create a `sitemap.xml` file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.w3.org/2000/svg">
  <url>
    <loc>https://sb-sajal.github.io/</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### Meta Tags
Update these in `index.html`:
- `og:image` — Share preview image
- `twitter:creator` — Your Twitter/X handle
- Schema.org `sameAs` array — Your social profiles
- `canonical` URL — Your actual domain

## 🛠 Technical Details

### Technologies
- **HTML5** — Semantic markup with ARIA attributes
- **CSS3** — Custom properties, Grid, Flexbox, animations, backdrop-filter
- **Vanilla JavaScript (ES6)** — Classes, Intersection Observer, Web Audio API, Canvas API

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with full touch support

### Performance
- Zero dependencies
- No external JavaScript libraries
- CSS animations (GPU-accelerated)
- Lazy loading for images
- Efficient Intersection Observer for scroll animations
- Debounced mouse events

### Accessibility
- Full keyboard navigation
- ARIA labels and roles
- Visible focus indicators
- `prefers-reduced-motion` support
- Semantic HTML structure
- High contrast ratios
- Screen reader friendly

## 🔧 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0B0B0B` | Main background |
| `--accent` | `#00ff88` | Neon green (primary) |
| `--accent-red` | `#ff3344` | Red (secondary accent) |
| `--text-primary` | `#ffffff` | Main text |
| `--glass-bg` | `rgba(255,255,255,0.03)` | Glass cards |

## 📝 License

This portfolio was designed and developed for **SAJAL BAIDDYA (Rafael)**.

---

<p align="center">
  Built with ❤️ by <strong>SAJAL BAIDDYA (Rafael)</strong>
</p>
