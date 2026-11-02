# Política de Privacidad — CamperSites Pro

**Desarrolladora y Responsable:** Nexus Studio (Nexus AI Holding)  
**Sitio Web:** https://nexusaiholding.com  
**Última actualización:** 2 de noviembre de 2026  
**Aplicación:** CamperSites Pro (iOS / Android)  
**Contacto DPO / Privacidad:** privacy@nexusaiholding.com / equipo-ia@proton.me  

---

## 1. Introducción

Nexus Studio / Nexus AI Holding ("nosotros", "la empresa") se compromete a proteger la privacidad de los usuarios de CamperSites Pro ("la aplicación"). Esta política describe cómo recopilamos, usamos, almacenamos y protegemos los datos personales conforme al Reglamento General de Protección de Datos (RGPD/GDPR - UE 2016/679) y la Ley Orgánica 3/2018 de Protección de Datos (LOPDGDD) de España.

## 2. Responsable del Tratamiento

- **Empresa:** Nexus Studio (Nexus AI Holding)
- **Web:** https://nexusaiholding.com
- **Contacto DPO:** privacy@nexusaiholding.com / equipo-ia@proton.me
- **Finalidad:** Prestacion del servicio de navegacion GPS, alertas de trafico y localizacion de campings/parkings para vehiculos.

## 3. Datos que Recopilamos

### 3.1 Datos proporcionados por el usuario
- Correo electronico (registro)
- Nombre de usuario (opcional)
- Preferencias de la aplicacion

### 3.2 Datos recopilados automaticamente
- **Ubicacion GPS**: Necesaria para el funcionamiento de la navegacion y sistema de alertas. Se procesa en tiempo real en el dispositivo. Solo se almacena en nuestros servidores cuando el usuario realiza un reporte de radar voluntariamente.
- **Datos del dispositivo**: Modelo del dispositivo y version del sistema operativo (para soporte tecnico).
- **Datos de uso**: Estadisticas anonimizadas de uso (km recorridos, campings visitados).

### 3.3 Datos que NO recopilamos
- Datos biometricos
- Historial de llamadas o mensajes
- Contactos del dispositivo
- Fotos o archivos del dispositivo
- Datos financieros (las transacciones las gestiona Apple/Google)

## 4. Base Legal del Tratamiento

| Dato | Base Legal | Finalidad |
|------|-----------|-----------|
| Email y nombre | Consentimiento (Art. 6.1.a RGPD) | Registro y autenticacion |
| Ubicacion GPS | Consentimiento explicito (Art. 6.1.a RGPD) | Navegacion y alertas en tiempo real |
| Reportes de radares | Interes legitimo (Art. 6.1.f RGPD) | Mejora del servicio comunitario |
| Estadisticas de uso | Interes legitimo (Art. 6.1.f RGPD) | Mejora del servicio (datos anonimizados) |

## 5. Como Usamos los Datos

- **Navegacion GPS**: Su ubicacion se procesa localmente en el dispositivo para calcular rutas y emitir alertas. No rastreamos su ubicacion cuando la aplicacion esta cerrada.
- **Sistema de alertas**: La posicion se compara con nuestra base de datos de radares localmente en el dispositivo.
- **Reportes voluntarios**: Cuando un usuario verifica la existencia de un radar, se registra la posicion del radar (no del usuario) junto con la confirmacion.
- **Mejora del servicio**: Datos anonimizados y agregados para mejorar la precision de la informacion.

## 6. Almacenamiento y Seguridad

### 6.1 Infraestructura
- Los datos se almacenan en servidores de **Supabase** (infraestructura de AWS), ubicados en la **Union Europea**.
- Todas las comunicaciones estan cifradas mediante **TLS 1.3**.
- La base de datos utiliza **cifrado en reposo (AES-256)**.
- Las contrasenas se almacenan mediante **hash bcrypt** con salt.

### 6.2 Medidas de seguridad
- **Row Level Security (RLS)**: Cada usuario solo puede acceder a sus propios datos.
- **Tokens JWT**: Autenticacion segura con expiracion automatica.
- **Principio de minimo privilegio**: La aplicacion solo solicita los permisos necesarios.
- **Anonimizacion**: Los datos estadisticos se anonimizan antes de su procesamiento.
- **Auditoria**: Registro de accesos a datos sensibles.

### 6.3 Periodo de conservacion
- **Datos de cuenta**: Mientras la cuenta este activa + 30 dias tras la solicitud de eliminacion.
- **Reportes de radares**: 12 meses desde su creacion.
- **Datos de uso**: 24 meses (anonimizados).
- **Logs de seguridad**: 90 dias.

## 7. Comparticion de Datos con Terceros

### 7.1 Proveedores de servicio
| Proveedor | Finalidad | Datos compartidos |
|-----------|-----------|-------------------|
| Supabase | Base de datos y autenticacion | Datos de cuenta cifrados |
| Mapbox | Calculo de rutas y mapas | Coordenadas de origen/destino (sin identificar al usuario) |
| Apple/Google | Distribucion de la app y pagos | Datos de transaccion (gestionados por ellos) |

### 7.2 No vendemos datos
YRYS **NO vende, alquila ni comercializa** datos personales de los usuarios a terceros bajo ninguna circunstancia.

### 7.3 Requerimientos legales
Solo compartiremos datos personales cuando sea requerido por ley, orden judicial o autoridad competente, conforme al articulo 6.1.c del RGPD.

## 8. Derechos del Usuario (RGPD)

Conforme a los articulos 15-22 del RGPD, usted tiene derecho a:

- **Acceso** (Art. 15): Solicitar una copia de sus datos personales.
- **Rectificacion** (Art. 16): Corregir datos inexactos.
- **Supresion** (Art. 17): Solicitar la eliminacion de sus datos ("derecho al olvido").
- **Portabilidad** (Art. 20): Recibir sus datos en formato estructurado y legible por maquina.
- **Oposicion** (Art. 21): Oponerse al tratamiento de sus datos.
- **Limitacion** (Art. 18): Solicitar la restriccion del tratamiento.
- **Retirar consentimiento**: En cualquier momento, sin que afecte a la licitud del tratamiento previo.

**Para ejercer estos derechos:** Envie un email a privacy@yrys.dev con el asunto "Ejercicio de derechos RGPD" indicando el derecho que desea ejercer. Responderemos en un plazo maximo de 30 dias.

**Autoridad de control:** Si considera que sus derechos no han sido atendidos, puede presentar una reclamacion ante la Agencia Espanola de Proteccion de Datos (AEPD) - www.aepd.es.

## 9. Ubicacion y GPS

- La aplicacion solicita permiso de ubicacion para funcionar. Este permiso es **revocable en cualquier momento** desde los ajustes del dispositivo.
- **Ubicacion en primer plano**: Necesaria para navegacion y alertas.
- **Ubicacion en segundo plano**: Solo se utiliza si el usuario activa explicitamente la navegacion continua. Se puede desactivar en cualquier momento.
- **Sin ubicacion**: La aplicacion funciona de forma limitada (solo consulta de campings/parkings sin alertas).

## 10. Menores de Edad

CamperSites Pro no esta dirigida a menores de 16 anos. No recopilamos intencionalmente datos de menores. Si tenemos conocimiento de que hemos recogido datos de un menor, los eliminaremos inmediatamente.

## 11. Cookies y Tecnologias Similares

La aplicacion movil no utiliza cookies. Se utiliza AsyncStorage (almacenamiento local del dispositivo) para:
- Mantener la sesion del usuario
- Guardar preferencias
- Cache de datos para uso offline

Estos datos se almacenan exclusivamente en el dispositivo del usuario y no se transmiten a terceros.

## 12. Transferencias Internacionales

Los datos se almacenan en servidores de la Union Europea (AWS EU). En caso de que algun proveedor procese datos fuera del EEE, se garantizaran las salvaguardas adecuadas conforme al Capitulo V del RGPD (clausulas contractuales tipo, decisiones de adecuacion o BCR).

## 13. Cambios en esta Politica

Nos reservamos el derecho de actualizar esta politica. Notificaremos cambios significativos mediante:
- Notificacion push en la aplicacion
- Aviso destacado al iniciar la app
- Email a los usuarios registrados

La fecha de la ultima actualizacion se indica al inicio de este documento.

## 14. Contacto

Para cualquier consulta sobre privacidad:

- **Email:** privacy@yrys.dev
- **Desarrolladora:** YRYS
- **Asunto:** Privacidad CamperSites Pro

---

*Esta politica de privacidad cumple con el RGPD (UE 2016/679), la LOPDGDD (Ley Organica 3/2018) y las directrices de la Agencia Espanola de Proteccion de Datos (AEPD).*
