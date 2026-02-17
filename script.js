document.addEventListener('DOMContentLoaded', () => {
    // Navigation Menu Toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // Close menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navMenu.classList.remove('active');
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Update active nav link on scroll
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section');
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= sectionTop - 60) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // Initialize Wellness Progress Chart
    initializeChart();

    // Handle Contact Form Submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleContactSubmit(contactForm);
        });
    }

    // Scroll reveal animations
    observeElements();
});

/**
 * Initialize the wellness progress chart
 */
function initializeChart() {
    const canvas = document.getElementById('progressChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
            datasets: [
                {
                    label: 'Energy Level',
                    data: [45, 52, 58, 65, 70, 78, 82, 88],
                    borderColor: '#6ec7a5',
                    backgroundColor: 'rgba(110, 199, 165, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#6ec7a5',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: 'Sleep Quality',
                    data: [55, 60, 62, 68, 72, 75, 80, 85],
                    borderColor: '#a8d8e8',
                    backgroundColor: 'rgba(168, 216, 232, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#a8d8e8',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: 'Overall Wellness',
                    data: [50, 58, 64, 72, 78, 82, 86, 92],
                    borderColor: '#f39c8f',
                    backgroundColor: 'rgba(243, 156, 143, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#f39c8f',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12,
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto"'
                        },
                        color: '#2c3e50'
                    }
                },
                filler: {
                    propagate: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#bdc3c7',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(110, 199, 165, 0.05)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#bdc3c7',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            }
        }
    });
}

/**
 * Handle contact form submission
 */
function handleContactSubmit(form) {
    const formData = new FormData(form);
    
    // Show success message (in a real app, this would submit to a server)
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-check"></i> Booking Confirmed!';
    submitBtn.style.background = '#6ec7a5';
    
    setTimeout(() => {
        form.reset();
        submitBtn.innerHTML = originalText;
        submitBtn.style.background = '';
        
        // Show alert
        alert('Thank you! We\'ll contact you shortly to confirm your consultation appointment.');
    }, 2000);
}

/**
 * Observe elements for scroll animations
 */
function observeElements() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const cards = document.querySelectorAll('.service-card, .blog-card, .testimonial-card, .tracking-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.6s ease-out';
        observer.observe(card);
    });
}
