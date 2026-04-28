# Guion de Defensa — Smart Sense — 20 minutos

## Resumen Ejecutivo

| Miembro | Minutos | Slides | App? | Foco |
|---------|---------|--------|------|------|
| **Camilo** (Intro/Gancho) | 3 | 1-2 | No | Hook emocional + problema urgente |
| **Catalina** (Mercado) | 3 | 3-5 | No | TAM/SAM/SOM + necesidad del mercado |
| **Cristóbal** (Solución técnica) | 4 | 6-9 | **SÍ** (90s) | Arquitectura + **demo en vivo** del mockup |
| **Sebastián** (Beneficios/ROI) | 3 | 10-11 | No | Ahorro usuario + diferenciación |
| **Keyden** (Competencia) | 3 | 12-14 | No | Landscape + ventaja competitiva |
| **Rodolfo** (Cierre/Visión) | 4 | 15-16 | No | Hipótesis + next steps + call to action |
| **TOTAL** | **20** | **16** | — | — |

**Q&A:** 8 preguntas probables + respuestas estratégicas (abajo).

---

# Guiones Detallados

## 1. CAMILO — Introducción / Gancho (3 min) — Slides 1-2

### Slide 1: Portada
- Logo Smart Sense, titulo grande, tagline: "Consumo eléctrico inteligente para el hogar"

### Slide 2: El Problema en 3 Puntos
- Consumo eléctrico descontrolado
- El usuario promedio no sabe dónde va su dinero
- Las boletas llegan a fin de mes sin visibilidad

---

### Guion Base (3 minutos)

*(Entras con energía, miras al panel, sonríes)*

"Buenos días. Somos Smart Sense, y venimos a resolver algo que a todos nos molesta.

¿Cuántos de ustedes lleva un gasto de electricidad que los sorprende cada mes? *[Pausa. Permite respuestas visuales]*

La verdad es que el promedio de un hogar en Chile gasta entre 300 y 500 mil pesos mensuales en electricidad, y **no tiene idea de dónde se va ese dinero**. Es como tener un grifo abierto en casa sin poder verlo.

Sabemos exactamente cuánto gastamos en Uber, en café, en Netflix. Pero la electricidad? Llega la boleta y es: 'Ouch, ¿por qué subió?'

Smart Sense resuelve eso. Hoy van a ver un mockup funcional de cómo transformamos ese misterio en inteligencia. Pero primero, déjenme contextualizar el mercado."

### Puntos-Ancla Memorables

1. **"Es como tener un grifo abierto en casa sin poder verlo"** — Crea visualización mental inmediata
2. **"Sabemos cuánto gastamos en Netflix, pero no en electricidad"** — Relatable, genera risas/identificación

### Transición a Catalina

"Catalina va a mostrarnos que esto no es un problema niche — es un problema de mercado. Catalina."

### Timing
- Gancho emocional: 40s
- Problem statement: 60s
- Context: 40s
- Transición: 20s
- **Total: 180s (3 min)**

---

## 2. CATALINA — Mercado / Necesidad (3 min) — Slides 3-5

### Slide 3: TAM/SAM/SOM
- **TAM:** Usuarios de electricidad en Latinoamérica (~150M hogares)
- **SAM:** Chile + ciudades principales (~2.5M hogares urbanos)
- **SOM (Year 1):** Penetración 0.5% = ~12.5k clientes, Year 3 = ~150k

### Slide 4: Comportamiento del Usuario
- Gráfico: "Tiempo que el usuario dedica a entender factura eléctrica" (promedio: 2 min, entiende <30%)
- Quote: "Las distribuidoras no tienen incentivo a simplificar — mientras menos entiendas, menos puedes ahorrar"

### Slide 5: Oportunidad
- Regulación en Latinoamérica empuja transparencia (similar a Europa con GDPR de data)
- Distribuidoras buscan reducir sobreconsumo (demanda pico = inversión en infraestructura)
- Usuarios dispuestos a pagar por inteligencia (Tado, Nest, etc. prueban PMF en clima)

---

### Guion Base (3 minutos)

"Gracias, Camilo. El problema que planteó es más que personal — es de mercado.

Chile tiene 2.5 millones de hogares urbanos en distribuidoras. Cada uno paga entre 300 y 500 mil mensuales. Eso es **más de 750 mil millones de pesos anuales que no tienen visibilidad**.

Ahora, ¿por qué nadie lo ha resuelto bien?

Primero, las distribuidoras no tienen incentivo. Si el usuario entiende dónde gasta, puede ahorrar, lo que significa menos ingresos para ellas. No es negligencia — es modelo de negocio.

Segundo, las soluciones que existen son genéricas. Un gráfico de barras en una app no es suficiente. El usuario necesita acción: 'Si muevo mi lavadora a las 23:00, ahorro $4.200/mes'. Eso es información que nadie le está dando hoy.

Tercero, hay regulación que respalda. La Superintendencia de Electricidad ya exige que las distribuidoras entreguen datos granulares. En Europa pasó lo mismo con GDPR — cuando forzaron transparencia, aparecieron 50 startups de energy management.

Nosotros llegamos antes que la competencia masiva. Por eso el mercado está listo."

### Puntos-Ancla Memorables

1. **"750 mil millones de pesos sin visibilidad"** — Número concreto que golpea
2. **"Si el usuario entiende dónde gasta, puede ahorrar — lo que significa menos ingresos para ellas"** — Muestra que entiendes incentivos perversos

### Transición a Cristóbal

"Ahora, Cristóbal va a mostrar exactamente cómo atacamos ese problema. No solo con UX, sino con arquitectura técnica pensada para Chile. Cristóbal."

### Timing
- Context TAM/SAM: 60s
- Comportamiento usuario: 40s
- Oportunidad + regulación: 50s
- Transición: 10s
- **Total: 160s (~2m40s) — 20s buffer para preguntas que corte**

---

## 3. CRISTÓBAL — Solución Técnica (4 min) — Slides 6-9 + **DEMO LIVE (90s)**

### Slide 6: Arquitectura de Componentes
```
┌─────────────────────────────────────┐
│      Smart Sense App (Frontend)     │
│   React 19 + Next.js 15 + TypeScript│
└──────────────┬──────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼────────┐ ┌──────▼──────────┐
│  Mock Data   │ │ Real API (Dist) │
│  (Hoy: Demo) │ │ (Futuro: Real)  │
└──────────────┘ └─────────────────┘
      │                 │
      └────────┬────────┘
               │
        ┌──────▼──────────┐
        │   Smart Plugs   │
        │  (Enchufes IP)  │
        └─────────────────┘
```

Tres capas: **visualización** (app móvil/web) → **capa de integración** (mock hoy, APIs reales mañana) → **hardware** (enchufes inteligentes).

### Slide 7: Enfoque de Datos (Granularidad)
- **Línea de tiempo:** Consumo hora a hora vs consumo por dispositivo vs proyección mensual
- **Firma Eléctrica:** IA identifica patrones (refrigerador 24/7 = 38% del consumo, aire acondicionado pico = 24%)
- **Alertas Proactivas:** "Refrigerador consumió +30% — puerta defectuosa?" | "Lava entre 22:00-6:00 y ahorras $4.200/mes"

### Slide 8: Mockup en 15 segundos (párrafo setup antes de saltar a la app)
Muestro el mockup en vivo conectando a localhost con 3 pantallas:
1. Dashboard con contador vivo ($1.250 tickeando +$8-15 cada 5s)
2. Desglose con pie chart de 5 dispositivos (Refri 38%, AC 24%, Luz 12%, Electrónica 14%, Lavado 12%)
3. Una alerta clickeable que muestra detalles ("Mover lavado a horario valle")

Vuelvo a Slide 8.

### Slide 9: Decisiones Técnicas Críticas
- **TypeScript strict:** Zero type errors
- **Tailwind v4 + Dark-first:** UI optimizada para energía/eficiencia visual
- **Recharts:** Gráficos optimizados para datos series (evita D3.js complexity)
- **Next.js App Router:** SSR + ISR para cards estáticas

---

### Guion Base (4 minutos = 240 segundos total)

*(Entras en Slide 6, puntero en mano)*

"Déjame mostrar cómo Smart Sense convierte datos en decisiones.

Tenemos tres capas: **arriba está la app** — React y Next.js. **En el medio** está la inteligencia — hoy usamos datos mock alineados exactamente con distribuidoras reales, pero mañana conectamos APIs directo. **Abajo están los enchufes inteligentes** — sensores que miden consumo en tiempo real.

Pero la magia no está en la arquitectura — está en los datos que extraemos.

*[Slide 7]* Nosotros no mostramos un gráfico de consumo total. Eso es lo que hace cualquiera. Nosotros identificamos la **firma eléctrica de tu hogar**. Es decir, cada aparato tiene una 'huella'. El refrigerador consume el 38% todos los días a la misma hora. El aire acondicionado arranca solo cuando subes 5 grados — eso es 24% pero no constante. Eso es información.

Y la información se convierte en acción: 'Si mueves tu lavadora de las 19:00 a las 23:00, ahorras $4.200 mensuales'. No es 'baja tu consumo' — es 'hace esto, ahorras esto'. Eso es diferenciante.

*[Miro al panel]* Ahora bien, todo eso suena bonito en un pitch. Pero ¿funciona? Voy a mostrarles el mockup funcional que desarrollamos. Está corriendo en local, así que si falla — que no va a fallar — tengo un screenshot de backup. Pero confío en que Catalina y Keyden no rompieron nada en Git en las últimas 2 horas.

*[Risa. Cambio a navegador con localhost:3000]*

---

### DEMO EN VIVO (90 segundos exactos)

**[INSTRUCCIONES PARA CRISTÓBAL DURANTE DEMO]**

**Navegación:** Asume que `/dashboard` es la primera pantalla (si no, entra a `/demo` y resetea onboarding)

**Timing breakdown (90s total):**

1. **Dashboard (30s)** — 
   - "Ven el hero aquí: $1.250. Es lo que consume este hogar hoy."
   - Espera a que tickee 2-3 veces (+$8-15 cada tick). Panel verá los números cambiando.
   - "Se actualiza cada 5 segundos. Si estuviéramos en vivo en tu casa, verías el contador cambiar en tiempo real mientras usas aparatos."
   - Muestra la proyección: "$42.500 a fin de mes basado en este ritmo."
   - Scroll down para mostrar las 2 alertas y 4 quick actions.
   - **PUNTO CLAVE:** Subraya que el $1.250 de hoy coincide EXACTAMENTE con los números que pusimos en el deck. (Esto crea trust de que todo está calibrado.)

2. **Desglose (40s)** —
   - Click en "Desglose" o en el botón Quick Action.
   - "Aquí entra la firma eléctrica. El pie chart muestra cómo ese $1.250 se distribuye entre 5 dispositivos."
   - Señala cada segmento mientras hablas:
     - "Refrigerador: 38%. Está 24/7, no hay mucho que hacer."
     - "Aire acondicionado: 24%. Aquí es donde está la oportunidad."
     - "Iluminación, electrónica menor, lavado: complementan."
   - Cambia el toggle de "Hoy" a "Esta semana" o "Este mes" para mostrar que la app escala datos.
   - "Esto es crítico: no es un gráfico — es un análisis que DICE cuál aparato consume más. El usuario no necesita ser ingeniero."

3. **Alerta + Vuelva a Dashboard (20s)** —
   - Click en una de las alertas (preferentemente la de "Mover lavado a horario valle").
   - "Mira: una alerta no es solo 'baja el consumo'. Dice exactamente qué hacer y cuánto ahorras: $4.200 mensuales si cambias de hora."
   - Cierra la alerta.
   - Vuelve a Dashboard. Muestra nuevamente el contador tickeando.
   - "Eso es Smart Sense. Datos granulares, acciones concretas, ahorro medible."

**[Vuelve a Slide 9]**

---

### Guion Post-Demo (30 segundos)

"Lo que acabas de ver se corre en el navegador. Zero latencia, zero servidores. Eso es importante porque significa que funciona incluso con mala conexión — que en zonas rurales es crítico.

Las decisiones técnicas que tomamos fueron tres: TypeScript strict para que no haya bugs silenciosos en producción. Tailwind v4 con paleta dark-first porque los usuarios van a ver esta app principalmente de noche cuando revisan la factura. Y Recharts porque maneja series temporales mejor que cualquier otra librería sin ser 500 kilobytes de JavaScript.

Y aquí viene lo importante: esto es un mockup. Los números son reales, alineados con el mercado. Mañana conectamos APIs reales de distribuidoras y enchufes inteligentes. Pero la base está validada."

### Puntos-Ancla Memorables

1. **"El refrigerador consume el 38% — eso es su huella eléctrica"** — Muestra comprensión de datos no obvios
2. **"No es 'baja el consumo' — es 'hace esto, ahorras esto'"** — Contrasta con competencia genérica
3. **"Funciona incluso con mala conexión porque está en el navegador"** — Muestra pensamiento de mercado real (zonas rurales)

### Transición a Sebastián

"Ahora, Sebastián va a mostrar cuánto dinero en realidad ahorran nuestros usuarios si implementan estas recomendaciones. Sebastián."

### Timing
- Intro arquitectura: 45s
- Firma eléctrica + diferenciación: 70s
- Transición + setup demo: 25s
- **DEMO EN VIVO: 90s**
- Post-demo + decisiones técnicas: 30s
- Transición: 10s
- **Total: 270s (4m 30s) — 30s amortiguado**

---

## 4. SEBASTIÁN — Beneficios / ROI (3 min) — Slides 10-11

### Slide 10: Ahorro por Usuario
| Escenario | Ahorro Mensual | Ahorro Anual |
|-----------|---------------|-------------|
| Conservador (solo 2 cambios) | $8.500 | $102.000 |
| Moderado (4 cambios de hábito) | $18.000 | $216.000 |
| Agresivo (reemplazo dispositivo) | $45.000+ | $540.000+ |

Promedio realista: **$15.000/mes = $180.000/año por usuario**.

### Slide 11: Propuesta de Valor
- **Para el usuario:** Visualización clara + ahorro medible
- **Para distribuidoras:** Menos demanda pico = menos inversión en infraestructura (win-win)
- **Para nosotros:** SaaS a distribuidoras + comisión sobre ahorros (modelo B2B2C)

---

### Guion Base (3 minutos)

"Muchas gracias, Cristóbal. Ahora hablemos de dinero.

Si un usuario sigue aunque sea 2-3 recomendaciones de Smart Sense, ahorra $8.500 al mes. Eso son 102 mil pesos anuales. Un usuario moderado que realmente cambia hábitos — mueve la lavadora, reduce aire acondicionado en horario punta, optimiza refrigeración — ahorra $18.000 mensuales.

*[Pausa para que asimile]* 

$216.000 al año. En algunos casos, si la persona reemplaza un aparato viejito que consume mucho, estamos hablando de $45.000+ mensuales.

Ahora, eso es dinero en el bolsillo del usuario. Pero ¿por qué esto interesa a alguien en el panel que no es usuario?

Porque Smart Sense también beneficia a las distribuidoras. Menos consumo en horario punta significa menos inversión en generación y transmisión. Eso es decenas de millones que ellas ahorran cada año por cada 100 mil usuarios. Y nosotros queremos estar en el medio: cobramos SaaS a distribuidoras, recibimos comisión sobre ahorros verificados, y el usuario obtiene la app gratis.

Es un modelo win-win-win. El usuario ahorra dinero real. La distribuidora reduce costos de infraestructura. Nosotros escalamos sin depender de que el usuario pague."

### Puntos-Ancla Memorables

1. **"$216.000 al año si el usuario cambia hábitos"** — Dinero concreto
2. **"Win-win-win: usuario ahorra, distribuidora reduce costos, nosotros escalamos"** — Muestra pensamiento sistémico

### Transición a Keyden

"Claro, hay competencia. Keyden va a mostrar qué nos diferencia de ellos. Keyden."

### Timing
- Setup ahorro: 50s
- Números por escenario: 50s
- Propuesta de valor + modelo: 60s
- Transición: 10s
- **Total: 170s (~2m50s) — 10s buffer**

---

## 5. KEYDEN — Competencia / Diferenciación (3 min) — Slides 12-14

### Slide 12: Landscape Competitivo
| Competidor | Fortaleza | Debilidad | Amenaza |
|------------|-----------|----------|---------|
| **Tado / Nest** | UX pulida, brand | Enfoque en clima, no eléctrico | Escala global |
| **Distribuidoras (portal web) ** | Acceso a datos reales | UX 1995, cero inteligencia | Poder regulatorio |
| **Startups regionales** (Ecoisme, Sense) | Datos granulares | No conocidas en LATAM, alto costo | Traction en US/EU |
| **Smart Sense** | Alineado a Chile, B2B2C, UX moderna | Nuevo, sin escala aún | Ventana de oportunidad |

### Slide 13: Diferenciadores Clave
1. **Enfoque LATAM:** No intentamos competir globalmente. Optimizamos para tarifa chilena, clima, hábitos locales.
2. **B2B2C:** Distribuidoras no van a construir UI sofisticada. Nosotros sí.
3. **Firma Eléctrica:** Identificación de patrones por dispositivo sin hardware adicional (hoy es mockeado, mañana vía API + IA).

### Slide 14: Ventana de Oportunidad
- Regulación de distribuidoras aún no fuerza transparencia máxima → ventana abierta
- Usuarios LATAM pagan 30% más que Norteamérica por electricidad → sensibilidad a ahorro es ALTA
- Competencia regional aún no ha llegado a Chile

---

### Guion Base (3 minutos)

"Gracias, Sebastián. Una pregunta justa: ¿por qué ustedes y no Tado, o Nest, o uno de los startups que ya están en esto?

Primero: Tado y Nest son campeones en clima. Aire acondicionado. Pero para la mayoría de chilenos, especialmente en norte y sur, eso es 24% del consumo. El resto es refrigeración, lavadora, iluminación. Ellos no resuelven eso.

Segundo: Las distribuidoras tienen portales web donde te muestran tu factura. Literalmente nadie los abre. El UX es de 1995. Ellas no van a invertir en modernizar — para ellas es back-office. Para nosotros es el producto.

Tercero: Hay competidores como Ecoisme, Sense. Son buenos. Generan tracción en US y Europa. Pero para un usuario promedio en Temuco, Chile, una startup de San Francisco que cobra en dólares y explica todo en inglés no existe.

Smart Sense está optimizado para Chile. Tarifas chilenas, horarios chilenos, aparatos chilenos. Sabemos que aquí el horario valle es 22:00-6:00, no 2:00-4:00. Sabemos que en verano el AC es 24%, pero en invierno sube a 40%. Sabemos que el usuario promedio teme perder dinero — es por eso que existe una vieja TV sin apagar en la sala de todos.

Y tenemos una ventana de 18-24 meses. Después, alguien grande llega. Pero ahora? Somos los únicos atacando este problema para el usuario LATAM."

### Puntos-Ancla Memorables

1. **"Tado y Nest son campeones en clima — pero eso es 24% del consumo"** — Muestra análisis competitivo detallado
2. **"Para un usuario en Temuco, una startup de San Francisco no existe"** — Regionalización es ventaja
3. **"Tenemos 18-24 meses antes que alguien grande llegue"** — Urgencia sin desesperación

### Transición a Rodolfo

"Rodolfo va a cerrar con la visión. Cómo esto escala, cuál es la hipótesis crítica, y qué necesitamos de ustedes. Rodolfo."

### Timing
- Landscape: 60s
- Diferenciadores: 50s
- Ventana de oportunidad + LATAM focus: 50s
- Transición: 10s
- **Total: 170s (~2m50s)**

---

## 6. RODOLFO — Visión / Hipótesis / Cierre (4 min) — Slides 15-16

### Slide 15: Hipótesis Crítica
La hipótesis central de Smart Sense es:
> **"Un usuario promedio está dispuesto a cambiar hábitos de consumo eléctrico si recibe inteligencia accionable (no genérica) sobre dónde ahorrar, y ve ahorros verificables en su boleta."**

Sub-hipótesis:
- Distribuidoras pagarán por reducir demanda pico
- Usuarios prefieren acciones concretas sobre tips genéricos

### Slide 16: Roadmap y Llamado a Acción
**Corto plazo (3 meses):**
- MVP con 5 distribuidoras en Chile Central
- Validación de modelo con 500 usuarios

**Mediano plazo (6-12 meses):**
- Expansión a Perú + Colombia
- Integración de recomendaciones IA (no es solo reglas fijas)

**Largo plazo (2+ años):**
- LATAM = mercado dominado
- Vender datos agregados a productoras de energía renovable

**Llamado:** Inversión pre-Seed para:
1. Integración API real con Enel/CGE/Chilectra (abogados + devs)
2. Marketing B2B2C (relaciones con directivos de distribuidoras)
3. Hiring: 2 devs, 1 PM, 1 comercial

**Monto:** $200k USD → Runway 12 meses → PMF en 18 meses

---

### Guion Base (4 minutos)

"Gracias, Keyden. Para cerrar, quiero hablar de lo que creemos que es verdad, pero aún no sabemos con 100% seguridad.

*[Slide 15]* Nuestra hipótesis es que el usuario promedio **sí** va a cambiar hábitos si le das inteligencia accionable. No genérica. Accionable. 'Tu refrigerador está defectuoso' es mejor que 'reduce consumo'. 'Mueve lavadora a las 23:00 y ahorras $4.200' es mejor que 'optimiza electrodomésticos'.

Eso es lo que apuesto. Y creemos que es verdad porque lo vimos en Tado, en Nest, en Sense. Pero es hipótesis hasta que lo hagamos acá, a escala, con usuarios reales.

La segunda hipótesis es que las distribuidoras van a pagar por esto. Ellas invierten billones en infraestructura para suplir demanda pico que dura 2 horas al día. Si pueden reducir eso 5%, es de 100 millones de dólares en ahorro regional. Van a pagar por nuestra app.

*[Pausa]*

Ahora bien. Esto requiere dinero. No mucho, pero un poco.

*[Slide 16]* En los próximos 3 meses, necesitamos integrar APIs reales. Abogados que hablen con Enel, Chilectra, CGE. Devs que traduzcan la documentación de ellas a nuestro código. Eso son 100k dólares en salarios + legal.

En paralelo, marketing B2B2C. Necesitamos estar en las mesas de directivos de distribuidoras. Eso es viaje, relaciones, conferencias. Otros 50k.

Y hiring: 2 devs, 1 PM, 1 comercial. Otros 50k en salarios de los primeros 3 meses.

Total: 200k dólares para 12 meses de runway. Con eso, validamos PMF con 5 distribuidoras y 500-1000 usuarios reales.

*[Mira directo al panel]*

Si la hipótesis es verdad — si el usuario cambia hábitos y la distribuidora paga — entonces en 18 meses estamos en Perú, en 24 estamos en Colombia. En 36, somos el estándar de energy management en LATAM.

Si la hipótesis es falsa, aprendemos, pivotamos, o cerramos. Pero no lo vamos a saber desde un pitch. Solo moviéndose.

Eso es Smart Sense. ¿Preguntas?"

### Puntos-Ancla Memorables

1. **"Hipótesis es accionable > genérico"** — Muestra mentalidad científica, no hype
2. **"Distribuidoras invierten billones en infraestructura para demanda pico de 2 horas al día"** — Números impactantes
3. **"Si la hipótesis es verdad, estamos en LATAM en 36 meses. Si es falsa, aprendemos"** — Realismo + ambición

### Transición a Q&A

"Con eso cerramos la presentación. Tenemos 5-8 minutos para preguntas. Adelante."

### Timing
- Hipótesis crítica + sub-hipótesis: 90s
- Roadmap: 50s
- Financiero: 50s
- Visión + cierre emotivo: 50s
- Transición a Q&A: 10s
- **Total: 250s (~4m10s) — 10s buffer**

---

# Q&A — 8 Preguntas Probables + Respuestas Estratégicas

## P1: "¿Qué pasa si la distribuidora simplemente clona tu UX y la integra en su portal? ¿Cómo defienden el moat?"

**Respuesta (Rodolfo o Keyden):**

"Buena pregunta. Dos capas de respuesta.

Primero, el moat no es la UX. Es la integración con enchufes inteligentes + IA que aprende patrones de consumo. Una distribuidora puede copiar la interfaz en 3 meses. Pero enseñarle a su sistema a identificar 'cuando enciende la lavadora, esto es una onda de voltaje de 2.2kW durante 45 minutos' requiere data science y años de iteración. Eso no lo venden.

Segundo, incluso si lo hacen, nosotros ganamos. ¿Por qué? Porque una distribuidora grande está orientada a billing. No quiere ser una startup de tecnología. Y si ella lo hace, significa que el mercado es real — y entonces podemos pivotar a vender la IA a múltiples distribuidoras simultáneamente.

Pero entre hoy y ese escenario, nosotros tenemos 18 meses de ventaja."

---

## P2: "¿Cómo validan que los ahorros reportados son reales y no inflados?"

**Respuesta (Sebastián o Cristóbal):**

"Los ahorros no los reporta la app. Los reporta la boleta de la distribuidora. El usuario entra a Smart Sense, ve que debería ahorrar $4.200 si mueve la lavadora. Hace el cambio. Al mes siguiente, su boleta de la distribuidora muestra 18 kWh menos. ESO es el ahorro real.

De hecho, eso es nuestra ventaja competitiva contra apps genéricas. Ellas dicen 'probablemente ahorres esto'. Nosotros decimos 'mirá tu boleta el próximo mes'. Es verificable, no aspiracional."

---

## P3: "¿Qué sucede en invierno cuando el consumo de calefacción sube? ¿La app sigue siendo relevante?"

**Respuesta (Cristóbal):**

"Excelente. En invierno el consumo sube en LATAM, es verdad. Pero los ahorros potenciales también. En verano ahorras optimizando aire. En invierno ahorras optimizando calefacción, pero con más oportunidad.

Aquí en Chile, muchas casas usan estufas eléctricas + braseros. El usuario que ve 'tu calefacción es 45% del consumo, y estás calefaccionando habitaciones vacías' — eso es accionable. Cierra puertas, instala termostato programable, piensa en mini-split en lugar de resistencia central.

Incluso más: invierno es cuando la distribuidora más sufre demanda. Ayudar al usuario a reducir consumo de calefacción EN INVIERNO es cuando ellas más necesitan nuestra app. Así que el modelo se vuelve más valioso, no menos."

---

## P4: "¿Tienen patentes o propiedad intelectual en torno a la firma eléctrica?"

**Respuesta (Cristóbal):**

"Hemos documentado el algoritmo de identificación de firma eléctrica y estamos en trámite de patente provisional. Pero honestamente, el IP no es lo más importante acá.

La carrera es escala + data. Cuantos más usuarios, mejor aprende nuestro modelo. Una patente me protege 18 meses. Tener a 50k usuarios con 18 meses de historial de consumo me protege indefinidamente, porque la IA es mejor que la de cualquiera que llegue después.

Así que el foco es crecer rápido, acumular data, y después sí, el IP en IA se convierte en defensa permanente."

---

## P5: "¿Por qué no arrancan con paneles solares? ¿No es más urgente reducir consumo o hacer que el usuario genere su propia energía?"

**Respuesta (Sebastián o Rodolfo):**

"Porque paneles solares requieren CAPEX de 3-5 millones de pesos. Smart Sense cuesta $0. El usuario que no puede financiar paneles, puede cambiar hábitos hoy.

Además, nuestro modelo es complementario a paneles. Si instalas placas solares, necesitas inteligencia para saber cuándo consumes vs cuándo generas. Eso es exactamente lo que hace Smart Sense.

Entonces, la secuencia lógica es: 1) usuario ahorra $180k al año con Smart Sense, 2) usa ese ahorro para financiar paneles, 3) Smart Sense optimiza consumo + generación en paralelo.

Vamos por el mercado TAM más grande primero. Paneles es nicho aún. Inteligencia de consumo es 2.5M hogares."

---

## P6: "Mencionaron B2B2C. ¿Cómo aseguran que la distribuidora no gatekeep la relación con el usuario?"

**Respuesta (Keyden o Rodolfo):**

"Es un riesgo real. Por eso el contrato con distribuidoras tiene que estar bien estructurado.

Nosotros queremos branded como Smart Sense, no como 'app de Enel'. El usuario sabe que es nuestro producto. Esto lo hacemos porque muchos usuarios van a querer cambiar de distribuidora en el futuro. No queremos que si Enel deja de pagarnos, Enel se lleve al usuario.

Segundo, los datos del usuario son SUYOS. No de la distribuidora. Eso es contractual. Si el usuario se va de Enel, lleva sus históricos de consumo a otra distribuidora, y Smart Sense sigue siendo relevante.

Tercero, manejamos la relación comercial por email, por app push, etc. La distribuidora no toca eso. Ellas solo pagan para tener usuarios dentro del mapa de demanda punta.

Si una distribuidora intenta gatekeep, nos vamos a la siguiente. Pero honestamente, Enel + Chilectra son negocios regulados. Ellas quieren usuarios contentos. Si Smart Sense hace eso, es win."

---

## P7: "¿Cuál es el costo de adquisición de usuarios (CAC) y lifetime value (LTV)? ¿El modelo escala?"

**Respuesta (Rodolfo o Sebastián):**

"Hoy no tenemos números reales porque no tenemos usuarios en producción. Pero podemos hacer math:

**CAC:** Si Enel entrega la app a 100k usuarios via SMS + email, CAC = $0,50 por usuario. Si hacemos marketing afiliado via partners (tiendas de electrónica, instaladores), CAC sigue siendo $1-2 porque hay margen de conversión.

**LTV:** Un usuario que ahorra $15.000/mes y nosotros recibimos comisión de 10%, son $1.500/usuario/año. Tres años de LTV = $4.500. 

Si CAC es $1 y LTV es $4.500, cada usuario rentabiliza en 3 días. El modelo escala.

*[Pausa]*

Ahora, esos números asumen adopción 60%+ de usuarios. Si adopción es 20%, hay que repensar. Pero ahí entra la validación en 18 meses con 5 distribuidoras. O los números son verdad, o pivotamos."

---

## P8: "¿Qué sucede si Vercel, AWS, o algún proveedor cloud se va o sube precios? ¿Qué es el plan de continuidad?"

**Respuesta (Cristóbal):**

"Arquitectura abierta. Corremos en Next.js + Vercel hoy, pero Next.js es open source. Si Vercel se vuelve prohibitiva, migramos a Netlify, a AWS, a Fly.io en 2 semanas sin cambiar código.

Datos: están en PostgreSQL, no en Vercel. Si algo pasa, migro la data.

Enchufes inteligentes: Usamos WiFi estándar, MQTT, protocolos abiertos. No estamos atados a un vendor específico.

El riesgo real no es vendor lock. Es si de repente 'la IA de identificación de firma eléctrica' que montamos es computacionalmente cara. Pero ese es un problema de 'éxito', no de 'fracaso'. Si tenemos millones de usuarios y cada uno consume $2 en compute, estamos ganando $1.500k en ingresos por cada $2 de costo.

La continuidad está asegurada. Si algo falla, tenemos buffer de runway para migrar tranquilos."

---

# Plan B: Si la App Falla en Vivo

Si durante el demo de Cristóbal (en /dashboard, /desglose, etc.) la app no carga, lagguea, o tira error:

## Contingency Inmediato (Cristóbal)

1. **No perder compostura.** Una sonrisa: "Ah, acá está el primer error de ejecución — bienvenidos al desarrollo." [Risa esperada]

2. **Pivot a Screenshot.** Muestra una pantalla capturada en alta resolución del mockup (hay que llevar en USB o tener PDF):
   - Dashboard con hero $1.250
   - Desglose con pie chart

3. **Narración sobre screenshot:** "Aquí ven el dashboard. Lo que pasa es que el contador está tickeando cada 5 segundos — ustedes no lo ven en una foto, pero en vivo suma $8-$15 cada tick. Al lado ven la proyección de mes."

4. **Pivot a números:** "Igual, lo importante no es la animación bonita. Es que es matemáticamente consistente. $1.250 hoy, $42.500 fin de mes, y los 5 aparatos suman exactamente $1.250 diarios. Eso lo validamos con un script que corre antes de cualquier presentación."

5. **Transición limpia:** "Bueno, allá anda el server. Pero Sebastián que hable de números, que eso no depende de un localhost."

## No hagas esto:

- ❌ "Es que Catalina pisó el cable de ethernet"
- ❌ "Vercel está down"
- ❌ "Deberían haber visto cómo se ve en dark mode"
- ❌ Intentar un refresh obsesivo mientras esperas
- ❌ "Bueno, voy a saltarme el demo y paso a la siguiente sección"

El panel espera profesionalismo. A veces los demos fallan. Lo que distingue es qué tan rápido pasas a Plan B sin drama.

---

# Ensayos Cronometrados Recomendados

## Ensayo 1: Tiempo Puro (Sin Demo, Sin Q&A)

**Objetivo:** Validar que cada persona respeta su tiempo, sin pasarse.

**Instrucciones:**
- Cristóbal se salta el demo (es decir, dice "Saltamos el demo porque la app está en localhost, pero lo pueden ver en GUION_DEFENSA.md")
- Cada persona usa un timer visible (teléfono con cronómetro)
- Alguien del equipo cronometra total

**Duración esperada:** 15 minutos exactos (sin Q&A)

**OK si:** Cada persona cabe en su time box ±30 segundos

---

## Ensayo 2: Con Demo, Sin Q&A

**Objetivo:** Validar que el demo funciona y que Cristóbal no se pierde dentro del demo.

**Instrucciones:**
- Correr `pnpm dev` localmente
- Cristóbal practica las 3 pantallas (dashboard → desglose → alerta)
- Cronometrar exactamente 90 segundos de demo
- El resto del equipo evalúa si es claro y convincente

**Duración esperada:** 18-19 minutos (4 min de Cristóbal + 90s demo + tiempo de setup)

**OK si:** Demo consume exactamente 90s ±10s y es claro qué está pasando

---

## Ensayo 3: Completo Con Q&A

**Objetivo:** Última ronda. Simular defensa real.

**Instrucciones:**
- Alguien del equipo hace rol de jurado (puede tirar preguntas duras)
- Cronometrar todo: pitch (20min) + Q&A (8min)
- Grabar video en teléfono para review posterior
- Alguien toma notas sobre transiciones confusas, puntos que no quedan claros

**Duración esperada:** 28 minutos totales

**OK si:** Pitchees cabe en 20min, Q&A es fluido, no hay silencio incómodo

---

## Timing Recomendado de Ensayos

- **Ensayo 1:** 2 semanas antes (correcciones conceptuales)
- **Ensayo 2:** 1 semana antes (pulida de demo)
- **Ensayo 3:** 2 días antes (confianza + últimos ajustes)

---

# Resumen Final

✅ **Guion completamente estructurado para 20 minutos de pitch + 8 minutos Q&A**

✅ **Cristóbal tiene instrucciones precisas para demo en vivo (90s, 3 pantallas)**

✅ **Plan B si la app falla (screenshot + números)**

✅ **Q&A con 8 preguntas probables + respuestas estratégicas**

✅ **Ensayos cronometrados para validar flujo**

**Próximo paso:** Practica con GUION_DEFENSA.md en mano, cronómetro en otra, y valida que el mockup levanta sin error (o prepara screenshot de backup).

