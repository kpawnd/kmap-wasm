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
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'share-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
};
