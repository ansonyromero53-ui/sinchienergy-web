# sinchienergy.com

Web pública de **SINCHI CARB**: bebida en gel de carbohidratos hecho en Salaverry, La Libertad. Sin cafeína.

- `index.html`, `styles.css`, `main.js`: página principal.
- `cuenta.html`: Club SINCHI (registro, inicio de sesión y Mi SINCHI).
- `sw.js`, `manifest.webmanifest`: app instalable.
- `assets/`: imágenes.

## Publicar
cPanel → Git Version Control → `sinchienergy-web` → Manage → Pull or Deploy → **Update from Remote** y **Deploy HEAD Commit**.
El archivo `.cpanel.yml` copia los archivos a `public_html`. Los íconos de `public_html/icons` y el backend (`sinchi_api`) no están en este repositorio.
