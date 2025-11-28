export const URLState = {
    encodeState(numVars, minterms, dontCares) {
        const params = new URLSearchParams();
        params.set('v', numVars);
        params.set('m', minterms.join(','));
        if (dontCares.length > 0) {
            params.set('d', dontCares.join(','));
        }
        return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    },
    
    decodeState() {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('v') || !params.has('m')) {
            return null;
        }
        
        const numVars = parseInt(params.get('v'));
        const minterms = params.get('m').split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
        const dontCares = params.has('d') 
            ? params.get('d').split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x))
            : [];
        
        return { numVars, minterms, dontCares };
    },
    
    loadFromURL() {
        const state = this.decodeState();
        if (state) {
            document.getElementById('variables').value = state.numVars;
            document.getElementById('minterms').value = state.minterms.join(', ');
            document.getElementById('dontcares').value = state.dontCares.join(', ');
            return true;
        }
        return false;
    }
};
