===============================
Cyllium - Plataforma de Predicción de Biodegradación
===============================

Este proyecto permite predecir la curva de biodegradación de productos bioplásticos
según sus características físicas y el ambiente seleccionado.

-------------------------------
REQUISITOS
-------------------------------
- Python 3.8 o superior
- Navegador web moderno (Chrome, Firefox, Edge)
- VS Code (recomendado) con extensión Live Server

-------------------------------
ESTRUCTURA DEL PROYECTO
-------------------------------
/tu_carpeta_proyecto
│
├── app.py                       ← Backend Flask (modelo ML)
├── modelo_random_forest.pkl     ← Modelo de predicción
├── products.html                ← Selección de parámetros
├── results.html                 ← Visualización del gráfico
├── /assets/                     ← Imágenes y videos
├── /css/                        ← Estilos
├── /js/                         ← JavaScript (si aplica)
└── requirements.txt             ← Dependencias de Python

-------------------------------
PASOS PARA USO LOCAL
-------------------------------

1. CREA ENTORNO VIRTUAL (opcional)
-----------------------------------
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

2. INSTALA DEPENDENCIAS
-------------------------------
pip install -r requirements.txt

3. EJECUTA EL BACKEND (modelo)
-------------------------------
python app.py

El backend Flask se abrirá en: http://localhost:5000

4. EJECUTA EL FRONTEND
-------------------------------
Opción A: usar Live Server (recomendado)
- Abre products.html con VS Code
- Clic derecho → “Open with Live Server”

Opción B: usar Python como servidor:
- En otra terminal:
python -m http.server 5500
- Abrir en navegador:
http://localhost:5500/products.html

5. FLUJO DE USUARIO
-------------------------------
- En products.html:
  - Selecciona el tipo de producto.
  - Ingresa dimensiones y materialidad.
  - Haz clic en "Calcular".

- En results.html:
  - Espera que cargue.
  - Haz clic en un ambiente (AEROBIA, ANAEROBIA, AMBIENTAL).
  - Se mostrará el gráfico de predicción.

-------------------------------
CONTACTO
-------------------------------
Desarrollado por Raimundo Varleta / Equipo Science de Bioelements]
