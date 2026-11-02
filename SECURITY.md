# Política de Seguridad y Prácticas de Desarrollo Seguro — CamperSites Pro

En **CamperSites Pro** aplicamos estándares de seguridad de nivel industrial para garantizar que tanto el código fuente, la infraestructura en la nube y los datos de nuestros usuarios permanezcan blindados contra accesos no autorizados y filtraciones de credenciales.

---

## 1. Reporte Responsable de Vulnerabilidades (Responsible Disclosure)

Si detectas cualquier fallo de seguridad, debilidad en la API o vulnerabilidad en la aplicación:
- **NO** abras una issue pública en GitHub.
- Envía un reporte confidencial a: `security@campersites.pro`
- Proporciona los pasos de reproducción y un vector de prueba de concepto (PoC).
- Nos comprometemos a responder en un plazo inferior a 48 horas y desplegar parches correctivos con máxima prioridad.

---

## 2. Higiene de Credenciales y Secret Scanning en Git

Para garantizar que ningún secreto sensible del proyecto sea expuesto en GitHub o repositorios públicos:
1. **Control estricto de `.gitignore`**:
   - Variables de entorno locales (`.env`, `.env.local`, `.env.*`) están permanentemente excluidas del rastreo de Git.
   - Certificados de firma de producción (`*.jks`, `*.keystore`, `*.p12`) nunca se suben al control de versiones.
   - El archivo `.env.example` contiene únicamente variables de plantilla sin valores reales.
2. **Políticas de Autenticación Supabase**:
   - La aplicación móvil utiliza exclusivamente la clave pública anónima (`SUPABASE_ANON_KEY`) sujeta a políticas de seguridad a nivel de fila (**Row Level Security - RLS**).
   - La clave maestra de administración (`service_role`) está estrictamente prohibida en el cliente móvil y reside únicamente en entornos aislados de backend o funciones serverless protegidas.
3. **Ofuscación y Hashing de Permisos Administrativos**:
   - Los permisos de soporte y administrador se verifican mediante funciones criptográficas de un solo sentido (HMAC-SHA256 con salt) sin almacenar contraseñas en texto plano dentro del código fuente compilado.

---

## 3. Prácticas de Privacidad en Conducción (Privacy-by-Design)

1. **Procesamiento de Telemetría Local:**
   - El cálculo de snap-to-road, la interpolación de radar de tramo y las alertas de gálibo se procesan **100% en el procesador del dispositivo móvil** en tiempo real.
   - Las coordenadas GPS del usuario **no se registran ni se retransmiten** a ningún servidor central durante la conducción continua, preservando la privacidad absoluta de los desplazamientos del usuario.
2. **Reportes Comunitarios Anónimos:**
   - Si el conductor reporta una incidencia o un radar móvil nuevo, únicamente se transmiten las coordenadas redondeadas del punto de interés, sin identificadores biométricos ni huellas del dispositivo.

---

## 4. Auditoría y Verificación de Dependencias

- Todas las dependencias de npm y gradle se verifican contra bases de datos de vulnerabilidades conocidas (`npm audit`).
- Los binarios generados se compilan con optimizaciones de producción y verificación de integridad.
