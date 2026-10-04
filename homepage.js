function highlightAbout() {
            const section = document.getElementById('about');
            section.scrollIntoView({ behavior: 'smooth' });
            section.style.background = 'white';
            setTimeout(() => {
                section.style.background = '#fafafa';
            }, 1200);
        }