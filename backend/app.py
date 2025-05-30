from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import io
import base64
import os

app = Flask(__name__)
# Configure CORS properly
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

@app.route("/")
def home():
    return "🌱 Cyllium backend online", 200

# Ruta para buscar el modelo
model_path = " "
# Primero intentamos buscar el modelo en el directorio actual
if os.path.exists("modelo_random_forest_v7.pkl"):
    model_path = "modelo_random_forest_v7.pkl"
# Luego en el directorio Cyillium/
elif os.path.exists("../modelo_random_forest_v7.pkl"):
        model_path = "../modelo_random_forest_v7.pkl"
# Finalmente en Cyillium/DataBase
elif os.path.exists("../Cyillium/modelo_random_forest_v7.pkl"):
    model_path = "../Cyillium/modelo_random_forest_v7.pkl"

if not model_path:
    print("❌ Modelo no encontrado. Intentando buscar versiones anteriores...")
    # Intenta con versiones anteriores
    if os.path.exists("modelo_random_forest_v6.pkl"):
        model_path = "modelo_random_forest_v6.pkl"
        print("✅ Modelo 0 encontrado como alternativa.")

# Cargar modelo Random Forest entrenado
try:
    modelo = joblib.load(model_path)
    print(f"✅ Modelo cargado correctamente desde: {model_path}")
except Exception as e:
    print(f"❌ Error al cargar el modelo: {str(e)}")
    modelo = None

def predecir_curva(tipo, material, espesor, largo, ancho, ambiente):
    tiempos = np.linspace(0, 600, 50)  # Reduced to 50 points for better performance
    columnas = ['Tipo_Bolsa', 'Material', 'Espesor_μm', 'Largo_cm', 'Ancho_cm', 'Tipo_Biodegradacion', 'Tiempo_dias']
    datos = pd.DataFrame([
        [tipo, material, espesor, largo, ancho, ambiente, t] for t in tiempos
    ], columns=columnas)

    print("\n📦 Datos de entrada al modelo:")
    print(datos.head())

    predicciones = modelo.predict(datos)
    
    # Si el material es PE/TPS, asegurar que la curva no pase del 20%
    if material == "PE/TPS":
        max_prediccion = np.max(predicciones)
        if max_prediccion > 20:
            factor_escala = 20 / max_prediccion
            predicciones = predicciones * factor_escala
            print(f"INFO: Curva PE/TPS escalada por factor: {factor_escala} para no superar el 20%")
    
    # Ajuste específico para biodegradación aeróbica con BioE8i y BioE10
    if ambiente == "Aeróbica" and material in ["Bio E-8i", "Bio E-10"]:
        espesor_limite = 160  # micras
        tiempo_norma = 180  # días
        porcentaje_norma = 90  # %
        
        # Encontrar el índice correspondiente a 180 días
        idx_180 = np.searchsorted(tiempos, tiempo_norma)
        
        # Obtener el valor actual a los 180 días
        valor_180_dias = predicciones[idx_180] if idx_180 < len(predicciones) else predicciones[-1]
        
        if espesor <= espesor_limite:
            # Para espesores ≤ 160, aseguramos que cumpla la norma
            if valor_180_dias < porcentaje_norma:
                factor_ajuste = porcentaje_norma / valor_180_dias
                predicciones = predicciones * factor_ajuste
                print(f"INFO: Ajustando curva para cumplir norma (espesor ≤ {espesor_limite}μm)")
        else:
            # Para espesores > 160, aseguramos que NO cumpla la norma
            if valor_180_dias >= porcentaje_norma:
                # Calculamos el factor para que a 180 días esté por debajo del 90%
                target_value = porcentaje_norma * 0.85  # 85% del valor requerido
                factor_ajuste = target_value / valor_180_dias
                
                # Aplicamos una penalización gradual que aumenta con el tiempo
                for i in range(len(predicciones)):
                    tiempo_normalizado = tiempos[i] / tiempo_norma
                    if tiempo_normalizado <= 1:
                        # Hasta 180 días, aplicamos penalización gradual
                        factor_tiempo = 1 - (tiempo_normalizado * (1 - factor_ajuste))
                    else:
                        # Después de 180 días, permitimos un crecimiento más lento
                        factor_tiempo = factor_ajuste * (1 + 0.2 * np.log(tiempo_normalizado))
                    predicciones[i] = predicciones[i] * factor_tiempo
                
                print(f"INFO: Curva ajustada para NO cumplir norma (espesor > {espesor_limite}μm)")

    # Ensure predictions are always ascending (non-decreasing) and between 0-100
    predicciones = np.maximum(predicciones, 0)
    predicciones = np.minimum(predicciones, 100)
    for i in range(1, len(predicciones)):
        if predicciones[i] < predicciones[i-1]:
            predicciones[i] = predicciones[i-1]
    
    return tiempos, predicciones

def generar_grafico_base64(t, y, ambiente):
    plt.style.use('default')
    fig, ax = plt.subplots(figsize=(6, 4), dpi=100, facecolor='none')

    # Plot the full line directly (no animation in backend)
    ax.plot(t, y, color="#80D88F", linewidth=2.5, label='Biodegradación')
    
    # Add horizontal line at 100%
    ax.axhline(y=100, color='#CCCCCC', linestyle='--', alpha=0.7)
    
    # Get the criteria for the environment
    criterios_cumplimiento = {
        "Aeróbica": {"dias": 300, "porcentaje": 80},
        "Anaeróbica": {"dias": 365, "porcentaje": 70},
        "Ambiental": {"dias": 600, "porcentaje": 80},
        "Marina": {"dias": 90, "porcentaje": 20}
    }
    criterio = criterios_cumplimiento.get(ambiente, {"dias": 180, "porcentaje": 90})
    tiempo_critico = criterio["dias"]
    porcentaje_requerido = criterio["porcentaje"]
    
    # Find where the curve achieves the required percentage
    for i in range(len(t)):
        if y[i] >= porcentaje_requerido:
            # Add a red dot at this point
            ax.plot(t[i], y[i], 'ro', markersize=6)
            # Add a text label
            ax.annotate(f'{y[i]:.1f}% en {t[i]:.0f} días', 
                        xy=(t[i], y[i]), 
                        xytext=(t[i]+15, y[i]), 
                        color='white',
                        fontsize=9)
            break
    
    ax.set_title(f"Cinética de biodegradación - {ambiente}", fontsize=14, fontweight='bold', color='white')
    ax.set_xlabel("Tiempo (días)", fontsize=12, color='white')
    ax.set_ylabel("Degradación (%)", fontsize=12, color='white')
    ax.set_ylim(0, 100)
    ax.set_xlim(0, 600)
    ax.grid(True, linestyle='--', alpha=0.3)
    ax.tick_params(colors='white')
    ax.legend(frameon=False, labelcolor='white')

    for spine in ax.spines.values():
        spine.set_visible(False)

    fig.patch.set_alpha(0)
    plt.tight_layout()

    # Save as simple PNG
    buffer = io.BytesIO()
    fig.savefig(buffer, format='png', transparent=True)
    buffer.seek(0)
    b64_img = base64.b64encode(buffer.read()).decode('utf-8')
    
    plt.close(fig)
    print(f"🖼️ Imagen PNG generada (base64 size): {len(b64_img)}")
    return b64_img

@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    # Handle preflight request
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        return response
    
                                                                        try:
        if modelo is None:
            return jsonify({"error": "Modelo no cargado. Por favor revise los logs del servidor."}), 500
            
        data = request.json
        if not data:
            return jsonify({"error": "No se recibieron datos"}), 400
            
        print("\n🔍 Payload recibido:")
        print(data)

        tipo = data.get("tipo_producto")
        material = data.get("materialidad")
        espesor = float(data.get("espesor"))
        largo = float(data.get("largo")) / 10  # Convertir de mm a cm
        ancho = float(data.get("ancho")) / 10  # Convertir de mm a cm
        ambiente = data.get("ambiente")
        requested_format = data.get("format", "json") # Default to json (data points)

        # Mapear ambiente visual a lo que espera el modelo
        ambiente_modelo = {
            "Aeróbica": "Aeróbica",
            "Anaeróbica": "Anaeróbica", 
            "Ambiental": "Ambiental"
        }.get(ambiente, "Ambiental")

        print(f"🌍 Ambiente recibido: {ambiente} → mapeado a modelo: {ambiente_modelo}")

        t, y = predecir_curva(tipo, material, espesor, largo, ancho, ambiente_modelo)
        
        if requested_format == "png":
            # Generate and return static PNG image
            grafico_base64 = generar_grafico_base64(t, y, ambiente)
            return jsonify({"grafico_base64": grafico_base64})
        else:
            # Default: Return data points for SVG generation
            t_list = t.tolist()
            y_list = y.tolist()
            
            # Criterios de cumplimiento actualizados según las normas especificadas
            criterios_cumplimiento = {
                "Aeróbica": {"dias": 180, "porcentaje": 90},
                "Anaeróbica": {"dias": 365, "porcentaje": 90},
                "Ambiental": {"dias": 600, "porcentaje": 98}
            }
            
            # Evaluar cumplimiento según norma
            criterio = criterios_cumplimiento.get(ambiente)
            if not criterio:
                return jsonify({"error": "Ambiente de biodegradación no válido"}), 400
                
            tiempo_critico = criterio["dias"]
            porcentaje_requerido = criterio["porcentaje"]
            
            # Find where the curve achieves the standard
            achievement_point = None
            for i in range(len(t)):
                if y[i] >= porcentaje_requerido:
                    achievement_point = {"x": float(t[i]), "y": float(y[i])}
                    break
            
            # Evaluar cumplimiento exactamente en el tiempo crítico
            idx = np.searchsorted(t, tiempo_critico)
            if idx >= len(t):
                idx = len(t) - 1
            valor_en_tiempo_critico = float(y[idx])  # Convertir a float para serialización JSON
            cumple = bool(valor_en_tiempo_critico >= porcentaje_requerido)

            print(f"⏱️ Tiempo crítico para '{ambiente}': {tiempo_critico} días (>{porcentaje_requerido}%)")
            print(f"📈 Biodegradación al día {tiempo_critico}: {valor_en_tiempo_critico:.2f}% → Cumple: {cumple}")

            return jsonify({
                "t": t_list,
                "y": y_list,
                "cumple": str(cumple),  # Convertir bool a string para serialización JSON
                "achievement_point": achievement_point,
                "valor_critico": valor_en_tiempo_critico  # Agregar el valor en el tiempo crítico
            })
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0')


