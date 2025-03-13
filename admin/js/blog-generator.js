// Blog post HTML generator for SUBE Academia
// This code handles the generation of static HTML files for blog posts

// Function to fetch template and generate blog post HTML
async function generateBlogPostHTML(postId, post) {
    try {
        // Fetch the blog post template
        const templateResponse = await fetch('../blog/template.html');
        if (!templateResponse.ok) {
            throw new Error(`Failed to fetch template: ${templateResponse.status}`);
        }
        
        let templateHTML = await templateResponse.text();
        
        // Format the date
        const postDate = post.date ? new Date(post.date.toDate()) : new Date();
        const formattedDate = new Intl.DateTimeFormat('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(postDate);
        
        // Calculate reading time (rough estimate: 200 words per minute)
        const wordCount = post.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        const readingTimeMinutes = Math.ceil(wordCount / 200);
        const readingTime = `${readingTimeMinutes} min`;
        
        // Generate table of contents
        const tocItems = generateTableOfContents(post.content);
        
        // Replace placeholders in the template
        const replacements = {
            '{{TITULO_ARTICULO}}': post.title,
            '{{META_DESCRIPTION}}': generateMetaDescription(post.content),
            '{{META_KEYWORDS}}': generateMetaKeywords(post.title, post.content),
            '{{AUTOR}}': post.author,
            '{{URL_ARTICULO}}': post.slug,
            '{{RUTA_IMAGEN_DESTACADA}}': post.imageUrl || '../assets/img/blog/default-post.jpg',
            '{{RUTA_IMAGEN_AUTOR}}': '../assets/img/team/default-author.jpg',
            '{{FECHA}}': formattedDate,
            '{{CATEGORIA}}': getCategoryFromContent(post.content),
            '{{CATEGORIA_URL}}': getCategoryFromContent(post.content).toLowerCase().replace(/\s+/g, '-'),
            '{{TIEMPO_LECTURA}}': readingTime,
            '{{CONTENIDO_ARTICULO}}': post.content,
            '{{ETIQUETAS_ARTICULO}}': generateTags(post.title, post.content),
            '{{URL_COMPLETA}}': `https://www.subeacademia.cl/blog/${post.slug}.html`,
            '{{TABLA_CONTENIDOS}}': tocItems,
            '{{ARTICULOS_RELACIONADOS}}': await generateRelatedPostsHTML(post),
            '{{ARTICULOS_POPULARES}}': await generatePopularPostsHTML(),
            '{{BIO_AUTOR}}': `Especialista en tecnologías avanzadas de IA y formación profesional.`,
            '{{REDES_SOCIALES_AUTOR}}': generateAuthorSocialLinks(post.linkedinProfile)
        };
        
        // Replace all placeholders
        for (const [placeholder, value] of Object.entries(replacements)) {
            templateHTML = templateHTML.replace(new RegExp(placeholder, 'g'), value);
        }
        
        // In a production environment, you would save this HTML to a file
        // For this example, we'll just log that it was generated successfully
        console.log(`Blog post HTML generated successfully for: ${post.title}`);
        
        // If you were using server-side code, you would save the file like this:
        // const fs = require('fs');
        // fs.writeFileSync(`../blog/posts/${post.slug}.html`, templateHTML);
        
        return templateHTML;
    } catch (error) {
        console.error('Error generating blog post HTML:', error);
        throw error;
    }
}

// Generate a meta description from content
function generateMetaDescription(content) {
    // Strip HTML tags and get plain text
    const plainText = content.replace(/<[^>]*>/g, '');
    // Take first 160 characters
    return plainText.substring(0, 157) + '...';
}

// Generate meta keywords from title and content
function generateMetaKeywords(title, content) {
    // Get keywords from title
    const titleWords = title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
    
    // Get most common words from content
    const contentWords = content.replace(/<[^>]*>/g, '')
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 4);
    
    // Count word occurrences
    const wordCount = {};
    contentWords.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Sort by frequency
    const sortedWords = Object.keys(wordCount).sort((a, b) => wordCount[b] - wordCount[a]);
    
    // Combine title words and top content words, remove duplicates
    const allKeywords = [...new Set([...titleWords, ...sortedWords.slice(0, 10)])];
    
    // Return top 8 keywords
    return allKeywords.slice(0, 8).join(', ');
}

// Determine category from content
function getCategoryFromContent(content) {
    // List of categories and associated keywords
    const categories = {
        'IA Generativa': ['generativa', 'generativo', 'gpt', 'dalle', 'difusión', 'diffusion', 'transformer'],
        'Machine Learning': ['machine learning', 'aprendizaje automático', 'ml', 'supervisado', 'no supervisado'],
        'Data Science': ['data science', 'ciencia de datos', 'análisis', 'datos', 'visualization'],
        'Deep Learning': ['deep learning', 'aprendizaje profundo', 'neural', 'neuronal', 'redes'],
        'Ética en IA': ['ética', 'responsable', 'sesgo', 'bias', 'fairness', 'transparencia'],
        'Tendencias': ['tendencia', 'futuro', 'avance', 'nueva', 'revolucionando'],
        'Tutorial': ['tutorial', 'guía', 'paso a paso', 'cómo', 'implementación']
    };
    
    // Convert content to lowercase and remove HTML tags
    const plainContent = content.toLowerCase().replace(/<[^>]*>/g, '');
    
    // Count keyword matches for each category
    const categoryScores = {};
    for (const [category, keywords] of Object.entries(categories)) {
        categoryScores[category] = keywords.reduce((score, keyword) => {
            const regex = new RegExp(keyword, 'gi');
            const matches = plainContent.match(regex);
            return score + (matches ? matches.length : 0);
        }, 0);
    }
    
    // Find category with highest score
    let bestCategory = 'Tendencias'; // Default category
    let highestScore = 0;
    
    for (const [category, score] of Object.entries(categoryScores)) {
        if (score > highestScore) {
            highestScore = score;
            bestCategory = category;
        }
    }
    
    return bestCategory;
}

// Generate tags from title and content
function generateTags(title, content) {
    // Get category as primary tag
    const category = getCategoryFromContent(content);
    
    // Extract potential tags from title
    const titleWords = title.toLowerCase()
        .replace(/[^\w\sáéíóúñ]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 4);
    
    // Define common tech terms that would make good tags
    const techTerms = [
        'inteligencia artificial', 'machine learning', 'deep learning', 'IA', 'ML', 
        'gpt', 'chatgpt', 'data science', 'big data', 'análisis', 'python',
        'tensorflow', 'pytorch', 'datos', 'algoritmo', 'modelo', 'transformers',
        'nlp', 'computer vision', 'visión computacional', 'ética', 'tutorial',
        'guía', 'tendencias', 'futuro', 'tecnología', 'innovación', 'neural',
        'redes neuronales', 'dataset', 'aprendizaje'
    ];
    
    // Extract tech terms from content
    const tags = [category]; // Start with category
    const plainContent = content.toLowerCase().replace(/<[^>]*>/g, '');
    
    // Check for tech terms in content
    techTerms.forEach(term => {
        if (plainContent.includes(term.toLowerCase()) && !tags.includes(term)) {
            tags.push(term);
        }
    });
    
    // Add some words from title if not already in tags
    titleWords.forEach(word => {
        if (!tags.some(tag => tag.toLowerCase().includes(word)) && tags.length < 5) {
            tags.push(word);
        }
    });
    
    // Limit to 5 tags and generate HTML
    return tags.slice(0, 5).map(tag => 
        `<a href="../blog.html?tag=${tag.toLowerCase().replace(/\s+/g, '-')}" class="article-tag">${tag}</a>`
    ).join('\n');
}

// Generate table of contents from content
function generateTableOfContents(content) {
    // Extract headings (h2 and h3) from content
    const h2Regex = /<h2[^>]*id="([^"]*)"[^>]*>(.*?)<\/h2>/gi;
    const h3Regex = /<h3[^>]*id="([^"]*)"[^>]*>(.*?)<\/h3>/gi;
    
    let tocItems = '';
    let match;
    
    // Get h2 headings
    while ((match = h2Regex.exec(content)) !== null) {
        const id = match[1];
        const text = match[2].replace(/<[^>]*>/g, ''); // Remove nested HTML tags
        tocItems += `<li><a href="#${id}">${text}</a></li>\n`;
        
        // Get h3 headings under this h2
        const h3Section = content.substring(match.index + match[0].length);
        const h3EndIndex = h3Section.indexOf('<h2');
        const h3Content = h3EndIndex !== -1 ? h3Section.substring(0, h3EndIndex) : h3Section;
        
        let h3Match;
        while ((h3Match = h3Regex.exec(h3Content)) !== null) {
            const h3Id = h3Match[1];
            const h3Text = h3Match[2].replace(/<[^>]*>/g, '');
            tocItems += `<li class="toc-list-h3"><a href="#${h3Id}">${h3Text}</a></li>\n`;
        }
    }
    
    return tocItems || '<li>No hay secciones disponibles</li>';
}

// Generate related posts HTML
async function generateRelatedPostsHTML(currentPost) {
    try {
        // Get the category of the current post
        const category = getCategoryFromContent(currentPost.content);
        
        // Get 3 posts from the same category, excluding the current post
        const snapshot = await db.collection('blog-posts')
            .orderBy('date', 'desc')
            .limit(5)
            .get();
        
        let relatedPosts = [];
        snapshot.forEach(doc => {
            const post = doc.data();
            if (post.title !== currentPost.title) {
                relatedPosts.push({
                    id: doc.id,
                    ...post
                });
            }
        });
        
        // Limit to 3 posts
        relatedPosts = relatedPosts.slice(0, 3);
        
        if (relatedPosts.length === 0) {
            return '<div class="col-12 text-center">No hay artículos relacionados disponibles.</div>';
        }
        
        let html = '';
        relatedPosts.forEach(post => {
            const postDate = post.date ? new Date(post.date.toDate()) : new Date();
            const formattedDate = new Intl.DateTimeFormat('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).format(postDate);
            
            html += `
            <div class="col-md-4 mb-4">
                <div class="related-post-card">
                    <div class="related-post-img">
                        <img src="${post.imageUrl || '../assets/img/blog/default-post.jpg'}" alt="${post.title}">
                    </div>
                    <div class="related-post-content">
                        <h5 class="related-post-title">
                            <a href="${post.slug}.html">${post.title}</a>
                        </h5>
                        <div class="related-post-meta">
                            <span><i class="far fa-user"></i> ${post.author}</span>
                            <span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
                        </div>
                    </div>
                </div>
            </div>
            `;
        });
        
        return html;
    } catch (error) {
        console.error('Error generating related posts:', error);
        return '<div class="col-12 text-center">Error al cargar artículos relacionados.</div>';
    }
}

// Generate popular posts HTML for sidebar
async function generatePopularPostsHTML() {
    try {
        // Get 3 most recent posts for sidebar
        const snapshot = await db.collection('blog-posts')
            .orderBy('date', 'desc')
            .limit(3)
            .get();
        
        if (snapshot.empty) {
            return '<div class="text-center">No hay artículos populares disponibles.</div>';
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const post = doc.data();
            const postDate = post.date ? new Date(post.date.toDate()) : new Date();
            const formattedDate = new Intl.DateTimeFormat('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).format(postDate);
            
            html += `
            <div class="popular-post">
                <div class="popular-post-img">
                    <img src="${post.imageUrl || '../assets/img/blog/default-post.jpg'}" alt="${post.title}">
                </div>
                <div class="popular-post-content">
                    <h6><a href="${post.slug}.html">${post.title}</a></h6>
                    <div class="post-date"><i class="far fa-calendar-alt me-1"></i> ${formattedDate}</div>
                </div>
            </div>
            `;
        });
        
        return html;
    } catch (error) {
        console.error('Error generating popular posts:', error);
        return '<div class="text-center">Error al cargar artículos populares.</div>';
    }
}

// Generate author social links
function generateAuthorSocialLinks(linkedinProfile) {
    let socialLinks = '';
    
    if (linkedinProfile) {
        socialLinks += `<a href="${linkedinProfile}" target="_blank" class="social-link linkedin"><i class="fab fa-linkedin-in"></i></a>`;
    }
    
    // Add default social links
    socialLinks += `
        <a href="#" class="social-link twitter"><i class="fab fa-twitter"></i></a>
        <a href="#" class="social-link facebook"><i class="fab fa-facebook-f"></i></a>
        <a href="#" class="social-link instagram"><i class="fab fa-instagram"></i></a>
    `;
    
    return socialLinks;
}

// Export the generate function to be used in admin.js
window.generateBlogPostHTML = generateBlogPostHTML;