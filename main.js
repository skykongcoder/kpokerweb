document.addEventListener('DOMContentLoaded', () => {
    console.log("KPOKER Animations Initialized.");

    // 1. Scroll Reveal Intersection Observer
    const revealElements = document.querySelectorAll('.reveal, .stagger-group');
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Uncomment mathematically if you only want to animate once
                // observer.unobserve(entry.target); 
            }
        });
    }, {
        root: null,
        threshold: 0.15, // Trigger when 15% of the element is visible
        rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // 2. Parallax effect on hero 3D image based on mouse movement
    const heroSection = document.querySelector('.hero-landing');
    const heroImage = document.querySelector('.hero-3d-img');
    const glowOrb = document.querySelector('.glow-orb');

    if (heroSection && heroImage) {
        heroSection.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            // Calculate distance from center
            const moveX = (clientX - centerX) / 50;
            const moveY = (clientY - centerY) / 50;

            // Apply parallax translation
            heroImage.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.02)`;
            if(glowOrb) {
                // Glow orb moves slightly in the opposite direction
                 glowOrb.style.transform = `translate(calc(-50% - ${moveX*1.5}px), calc(-50% - ${moveY*1.5}px))`;
            }
        });
        
        // Reset on mouse leave
        heroSection.addEventListener('mouseleave', () => {
             heroImage.style.transform = `translate(0px, 0px) scale(1)`;
             if(glowOrb) {
                 glowOrb.style.transform = `translate(-50%, -50%)`;
             }
        });
    }

    // 3. 3D Tilt Hover effect for cards
    const cards = document.querySelectorAll('.card-img-link, .feature-card, .strategy-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; 
            const y = e.clientY - rect.top;  
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -12; // Max rotation 12deg
            const rotateY = ((x - centerX) / centerX) * 12;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
            card.style.transition = 'transform 0.1s ease'; // Snappy tracking
            card.style.zIndex = "10";
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`;
            card.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease'; // Smooth reset
            card.style.zIndex = "1";
        });
    });

    // 4. Welcome Promo Modal Logic
    const promoModal = document.getElementById('promoModal');
    const closeModal = document.getElementById('closeModal');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const hideTodayCheckbox = document.getElementById('hideToday');
    const promoActionBtn = document.getElementById('promoActionBtn');

    if (promoModal) {
        // Check localStorage for "Do not show today" flag
        const hideUntil = localStorage.getItem('kpokerPromoHideUntil');
        const now = new Date().getTime();
        
        // Show modal only if no flag exists, or the flag has expired (24hrs passed)
        if (!hideUntil || now > parseInt(hideUntil, 10)) {
            setTimeout(() => {
                promoModal.classList.add('show');
            }, 1500);
        }

        // Reusable close handler that processes the checkbox
        const handleModalClose = () => {
            if (hideTodayCheckbox && hideTodayCheckbox.checked) {
                // Save explicitly for 24 hours (86400000 ms) from now
                const expireTime = now + (24 * 60 * 60 * 1000);
                localStorage.setItem('kpokerPromoHideUntil', expireTime.toString());
            }
            promoModal.classList.remove('show');
        };

        // Bind Close logic to button, overlay, and main CTA
        closeModal.addEventListener('click', handleModalClose);

        promoModal.addEventListener('click', (e) => {
            if(e.target === promoModal) {
                handleModalClose();
            }
        });

        if (promoActionBtn) {
            promoActionBtn.addEventListener('click', handleModalClose);
        }

        // Copy Code Logic (Clipboard API)
        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', () => {
                const code = document.getElementById('promoCode').innerText;
                navigator.clipboard.writeText(code).then(() => {
                    copyCodeBtn.classList.add('success');
                    copyCodeBtn.innerText = '복사완료!';
                    setTimeout(() => {
                        copyCodeBtn.classList.remove('success');
                        copyCodeBtn.innerText = '복사하기';
                    }, 2000);
                });
            });
        }
    }

    // 5. Inline Code Box Logic
    const inlineCopyBtns = document.querySelectorAll('.btn-copy-inline');
    inlineCopyBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const code = this.getAttribute('data-code');
            navigator.clipboard.writeText(code).then(() => {
                const originalHTML = this.innerHTML;
                this.innerHTML = '<i class="ph ph-check"></i> 완료';
                this.style.background = '#10b981';
                this.style.color = '#fff';
                setTimeout(() => {
                    this.innerHTML = originalHTML;
                    this.style.background = '';
                    this.style.color = '';
                }, 2000);
            });
        });
    });
});
