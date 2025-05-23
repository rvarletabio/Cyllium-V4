/* ---------- CONFIG ---------- */
const API = "https://cyllium-backend-v3.onrender.com/predict";   // ← cambia esto
/* ---------------------------- */

// Environmental impact factors per kg of material
const materialImpacts = {
    // Bioelements Materials
    bioe8i: { 
        co2: 3.93,
        energy: 66.33,
        water: 248.33,
        waste: 0.05
    },
    bioe10: {
        co2: 3.5,
        energy: 60,
        water: 220,
        waste: 0.04
    },
    bioe9: {
        co2: 3.7,
        energy: 63,
        water: 235,
        waste: 0.045
    },
    // Bio-based
    pla: { co2: 3.8, energy: 67, water: 235, waste: 0.05 },
    pbat: { co2: 4.2, energy: 82, water: 310, waste: 0.06 },
    pha: { co2: 2.8, energy: 50, water: 180, waste: 0.04 },
    
    // Conventional Plastics
    pet: { co2: 6.5, energy: 85, water: 305, waste: 0.08 },
    hdpe: { co2: 6.0, energy: 76, water: 280, waste: 0.07 },
    ldpe: { co2: 6.2, energy: 78, water: 290, waste: 0.07 },
    pp: { co2: 5.8, energy: 73, water: 275, waste: 0.06 },
    
    // Paper & Wood
    cardboard: { co2: 1.5, energy: 25, water: 400, waste: 0.02 },
    paper: { co2: 1.2, energy: 22, water: 380, waste: 0.015 },
    wood: { co2: 0.8, energy: 15, water: 150, waste: 0.01 },
    
    // Metal & Glass
    aluminum: { co2: 11.0, energy: 155, water: 1500, waste: 0.15 },
    steel: { co2: 7.8, energy: 95, water: 800, waste: 0.1 },
    glass: { co2: 0.9, energy: 15.5, water: 45, waste: 0.05 }
};

// Lifecycle stage impact factors (percentage of total impact)
const lifecycleFactors = {
    production: 0.6,    // 60% of total impact
    transport: 0.15,    // 15% of total impact
    usage: 0.1,         // 10% of total impact
    endOfLife: 0.15     // 15% of total impact
};

// Calculate lifecycle impacts
function calculateLifecycleImpacts(totalCO2, totalEnergy, totalWater, totalWaste) {
    return {
        production: {
            co2: totalCO2 * lifecycleFactors.production,
            energy: totalEnergy * lifecycleFactors.production,
            water: totalWater * lifecycleFactors.production,
            waste: totalWaste * lifecycleFactors.production
        },
        transport: {
            co2: totalCO2 * lifecycleFactors.transport,
            energy: totalEnergy * lifecycleFactors.transport,
            water: totalWater * lifecycleFactors.transport,
            waste: totalWaste * lifecycleFactors.transport
        },
        usage: {
            co2: totalCO2 * lifecycleFactors.usage,
            energy: totalEnergy * lifecycleFactors.usage,
            water: totalWater * lifecycleFactors.usage,
            waste: totalWaste * lifecycleFactors.usage
        },
        endOfLife: {
            co2: totalCO2 * lifecycleFactors.endOfLife,
            energy: totalEnergy * lifecycleFactors.endOfLife,
            water: totalWater * lifecycleFactors.endOfLife,
            waste: totalWaste * lifecycleFactors.endOfLife
        }
    };
}

// Add a new component to the calculator
function addComponent() {
    const template = document.getElementById('component-template');
    const container = document.getElementById('components-container');
    const clone = template.content.cloneNode(true);
    container.appendChild(clone);
    updateTotalImpact();
}

// Remove a component from the calculator
function removeComponent(button) {
    button.closest('.component-card').remove();
    updateTotalImpact();
}

// Update impact when material or weight changes
function updateImpact(element) {
    updateTotalImpact();
}

// Calculate total impact of all components
function updateTotalImpact() {
    let totalCO2 = 0;
    let totalEnergy = 0;
    let totalWater = 0;
    let totalWaste = 0;
    
    const components = document.querySelectorAll('.component-card');
    const productionVolume = parseFloat(document.querySelector('.production-volume').value) || 1;
    
    components.forEach(component => {
        const material = component.querySelector('.material-type').value;
        const weight = parseFloat(component.querySelector('.weight').value) || 0;
        
        if (materialImpacts[material]) {
            totalCO2 += materialImpacts[material].co2 * weight * productionVolume;
            totalEnergy += materialImpacts[material].energy * weight * productionVolume;
            totalWater += materialImpacts[material].water * weight * productionVolume;
            totalWaste += materialImpacts[material].waste * weight * productionVolume;
        }
    });
    
    // Update the display
    document.getElementById('co2-impact').textContent = `CO₂: ${totalCO2.toFixed(2)} kg`;
    document.getElementById('energy-impact').textContent = `Energía: ${totalEnergy.toFixed(2)} kWh`;
    document.getElementById('water-impact').textContent = `Agua: ${totalWater.toFixed(2)} L`;
    document.getElementById('waste-impact').textContent = `Residuos: ${totalWaste.toFixed(2)} kg`;
}

// Product storage functions
function saveProduct(productData) {
    const userId = localStorage.getItem('userId'); // Asumiendo que guardamos el userId al iniciar sesión
    if (!userId) return;

    let userProducts = JSON.parse(localStorage.getItem(`products_${userId}`) || '[]');
    productData.id = Date.now(); // Usar timestamp como ID único
    productData.date = new Date().toISOString();
    userProducts.push(productData);
    localStorage.setItem(`products_${userId}`, JSON.stringify(userProducts));
}

function loadUserProducts() {
    const userId = localStorage.getItem('userId');
    if (!userId) return [];
    return JSON.parse(localStorage.getItem(`products_${userId}`) || '[]');
}

function deleteProduct(productId) {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    let userProducts = JSON.parse(localStorage.getItem(`products_${userId}`) || '[]');
    userProducts = userProducts.filter(p => p.id !== productId);
    localStorage.setItem(`products_${userId}`, JSON.stringify(userProducts));
    displayProducts(); // Actualizar la vista
}

function displayProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    const products = loadUserProducts();
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = '<p class="text-white text-center">No hay productos guardados</p>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-name">${product.name}</div>
            <div class="product-date">${new Date(product.date).toLocaleDateString()}</div>
            <div class="product-metrics">
                <div class="metric">CO₂: ${product.totalImpact.co2.toFixed(2)} kg</div>
                <div class="metric">Energía: ${product.totalImpact.energy.toFixed(2)} kWh</div>
                <div class="metric">Agua: ${product.totalImpact.water.toFixed(2)} L</div>
                <div class="metric">Residuos: ${product.totalImpact.waste.toFixed(2)} kg</div>
            </div>
            <div class="action-buttons">
                <button class="action-btn" onclick="viewProduct(${product.id})">Ver Detalles</button>
                <button class="action-btn" onclick="duplicateProduct(${product.id})">Duplicar</button>
                <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">Eliminar</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function viewProduct(productId) {
    const userId = localStorage.getItem('userId');
    const products = JSON.parse(localStorage.getItem(`products_${userId}`) || '[]');
    const product = products.find(p => p.id === productId);
    
    if (product) {
        localStorage.setItem('packagingComponents', JSON.stringify({
            components: product.components,
            productionVolume: product.productionVolume,
            productName: product.name
        }));
        window.location.href = 'calculator_result.html';
    }
}

function duplicateProduct(productId) {
    const userId = localStorage.getItem('userId');
    const products = JSON.parse(localStorage.getItem(`products_${userId}`) || '[]');
    const product = products.find(p => p.id === productId);
    
    if (product) {
        const newProduct = {...product};
        newProduct.id = Date.now();
        newProduct.date = new Date().toISOString();
        newProduct.name = `${product.name} (Copia)`;
        
        products.push(newProduct);
        localStorage.setItem(`products_${userId}`, JSON.stringify(products));
        displayProducts();
    }
}

// Modify existing functions to handle product names
function calculateAndRedirect() {
    const components = [];
    document.querySelectorAll('.component-card').forEach(component => {
        components.push({
            name: component.querySelector('.component-name').value || 'Componente sin nombre',
            type: component.querySelector('.component-type').value,
            material: component.querySelector('.material-type').value,
            weight: parseFloat(component.querySelector('.weight').value) || 0
        });
    });
    
    const productionVolume = parseFloat(document.querySelector('.production-volume').value) || 1;
    const productName = document.getElementById('product-name').value || 'Producto sin nombre';
    
    const totalImpact = calculateTotalImpact(components, productionVolume);
    
    // Save product data
    const productData = {
        name: productName,
        components: components,
        productionVolume: productionVolume,
        totalImpact: totalImpact,
        date: new Date().toISOString()
    };
    
    saveProduct(productData);
    
    // Save current calculation for results page
    localStorage.setItem('packagingComponents', JSON.stringify({
        components: components,
        productionVolume: productionVolume,
        productName: productName
    }));
    
    // Redirect to results page
    window.location.href = 'calculator_result.html';
}

function calculateTotalImpact(components, productionVolume) {
    let totalCO2 = 0;
    let totalEnergy = 0;
    let totalWater = 0;
    let totalWaste = 0;
    
    components.forEach(component => {
        if (materialImpacts[component.material]) {
            totalCO2 += materialImpacts[component.material].co2 * component.weight * productionVolume;
            totalEnergy += materialImpacts[component.material].energy * component.weight * productionVolume;
            totalWater += materialImpacts[component.material].water * component.weight * productionVolume;
            totalWaste += materialImpacts[component.material].waste * component.weight * productionVolume;
        }
    });
    
    return {
        co2: totalCO2,
        energy: totalEnergy,
        water: totalWater,
        waste: totalWaste
    };
}

// Modify the updateResults function to show product name
function updateResults() {
    try {
        const data = JSON.parse(localStorage.getItem('packagingComponents') || '{"components": [], "productionVolume": 1, "productName": ""}');
        const componentsData = data.components;
        const productionVolume = data.productionVolume;
        const productName = data.productName;
        
        // Add product name to the results page if it exists
        const titleElement = document.getElementById('results-title');
        if (titleElement && productName) {
            titleElement.textContent = `Resultados: ${productName}`;
        }
        
        let totalCO2 = 0;
        let totalEnergy = 0;
        let totalWater = 0;
        let totalWaste = 0;
        
        // Calculate totals
        componentsData.forEach(component => {
            if (materialImpacts[component.material]) {
                totalCO2 += materialImpacts[component.material].co2 * component.weight * productionVolume;
                totalEnergy += materialImpacts[component.material].energy * component.weight * productionVolume;
                totalWater += materialImpacts[component.material].water * component.weight * productionVolume;
                totalWaste += materialImpacts[component.material].waste * component.weight * productionVolume;
            }
        });
        
        // Update total impact display
        document.getElementById('total-co2').textContent = `CO₂: ${totalCO2.toFixed(2)} kg`;
        document.getElementById('total-energy').textContent = `Energía: ${totalEnergy.toFixed(2)} kWh`;
        document.getElementById('total-water').textContent = `Agua: ${totalWater.toFixed(2)} L`;
        document.getElementById('total-waste').textContent = `Residuos: ${totalWaste.toFixed(2)} kg`;
        
        // Calculate and update lifecycle impacts
        const lifecycle = calculateLifecycleImpacts(totalCO2, totalEnergy, totalWater, totalWaste);
        
        // Update production impact
        document.getElementById('production-impact').innerHTML = `
            CO₂: ${lifecycle.production.co2.toFixed(2)} kg<br>
            Energía: ${lifecycle.production.energy.toFixed(2)} kWh<br>
            Agua: ${lifecycle.production.water.toFixed(2)} L<br>
            Residuos: ${lifecycle.production.waste.toFixed(2)} kg
        `;
        
        // Update transport impact
        document.getElementById('transport-impact').innerHTML = `
            CO₂: ${lifecycle.transport.co2.toFixed(2)} kg<br>
            Energía: ${lifecycle.transport.energy.toFixed(2)} kWh<br>
            Agua: ${lifecycle.transport.water.toFixed(2)} L<br>
            Residuos: ${lifecycle.transport.waste.toFixed(2)} kg
        `;
        
        // Update usage impact
        document.getElementById('usage-impact').innerHTML = `
            CO₂: ${lifecycle.usage.co2.toFixed(2)} kg<br>
            Energía: ${lifecycle.usage.energy.toFixed(2)} kWh<br>
            Agua: ${lifecycle.usage.water.toFixed(2)} L<br>
            Residuos: ${lifecycle.usage.waste.toFixed(2)} kg
        `;
        
        // Update end of life impact
        document.getElementById('end-of-life-impact').innerHTML = `
            CO₂: ${lifecycle.endOfLife.co2.toFixed(2)} kg<br>
            Energía: ${lifecycle.endOfLife.energy.toFixed(2)} kWh<br>
            Agua: ${lifecycle.endOfLife.water.toFixed(2)} L<br>
            Residuos: ${lifecycle.endOfLife.waste.toFixed(2)} kg
        `;
        
        // Update production volume display
        const volumeInfo = document.querySelector('.metric-value');
        if (volumeInfo) {
            const currentLang = getLanguage();
            const translations = {
                en: `Total Production Volume: ${productionVolume} units`,
                es: `Volumen Total de Producción: ${productionVolume} unidades`,
                pt: `Volume Total de Produção: ${productionVolume} unidades`
            };
            volumeInfo.textContent = translations[currentLang] || translations.en;
        }
        
        // Create impact distribution chart
        const ctx = document.getElementById('impactChart');
        if (ctx) {
            new Chart(ctx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: ['Producción', 'Transporte', 'Uso', 'Fin de Vida'],
                    datasets: [{
                        data: [60, 15, 10, 15],
                        backgroundColor: [
                            'rgba(63, 207, 142, 0.8)',
                            'rgba(54, 162, 235, 0.8)',
                            'rgba(255, 206, 86, 0.8)',
                            'rgba(255, 99, 132, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    } catch (error) {
        console.error('Error updating results:', error);
        // Show error message to user
        const elements = ['total-co2', 'total-energy', 'total-water', 'total-waste'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'Error al calcular';
            }
        });
    }
}

// Initialize pages
window.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('calculator.html')) {
        addComponent();
    } else if (path.includes('calculator_result.html')) {
        updateResults();
    } else if (path.includes('my_products.html')) {
        displayProducts();
    }
});
