export const ImageExporter = {
    async exportKMapAsPNG() {
        const kmapSection = document.getElementById('kmapSection');
        
        if (!kmapSection || kmapSection.style.display === 'none') {
            alert('Please solve a K-map first before exporting.');
            return;
        }
        
        try {
            if (!window.html2canvas) {
                alert('Export library not loaded. Please refresh the page.');
                return;
            }
            
            const canvas = await html2canvas(kmapSection, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false
            });
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `kmap-${new Date().toISOString().slice(0, 10)}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showNotification('✓ K-map exported successfully!');
            });
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export image. Please try again.');
        }
    },
    
    showNotification(message, type = 'success') {
        // Remove any existing popup immediately
        document.querySelectorAll('.popup-overlay').forEach(el => el.remove());
        
        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        
        const popup = document.createElement('div');
        popup.className = 'popup-modal';
        
        const iconMap = {
            success: '✓',
            error: '✗',
            info: 'ℹ',
            warning: '⚠'
        };
        
        const icon = iconMap[type] || iconMap.success;
        popup.innerHTML = `
            <div class="popup-icon ${type}">${icon}</div>
            <div class="popup-message">${message}</div>
        `;
        
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        
        // Close on click
        overlay.addEventListener('click', () => overlay.remove());
        
        // Auto-close after 1.5 seconds
        setTimeout(() => overlay.remove(), 1500);
    }
};
