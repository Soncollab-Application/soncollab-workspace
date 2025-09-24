const fs = require('fs');
const path = require('path');

function mergeTranslations(projectName) {
  const SOURCE_DIR = `./projects/${projectName}/public/assets/i18n/modules`;
  const OUTPUT_DIR = `./projects/${projectName}/public/assets/i18n`;
  const LANGUAGES = ['fr', 'en'];

  // Vérifier si le projet a des modules i18n
  if (!fs.existsSync(SOURCE_DIR)) {
    return;
  }

  // Créer le dossier de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Fonction récursive pour trouver tous les fichiers de traduction
  function findTranslationFiles(dir, lang) {
    const files = [];

    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach(item => {
      const itemPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        // Explorer récursivement le sous-dossier
        files.push(...findTranslationFiles(itemPath, lang));
      } else if (item.isFile() && item.name.endsWith(`.${lang}.json`)) {
        // Fichier de traduction trouvé
        files.push(itemPath);
      }
    });

    return files;
  }

  LANGUAGES.forEach(lang => {
    const mergedTranslations = {};

    // Trouver tous les fichiers de traduction pour cette langue
    const translationFiles = findTranslationFiles(SOURCE_DIR, lang);

    translationFiles.forEach(filePath => {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Fusionner directement le contenu dans l'objet principal
        Object.assign(mergedTranslations, content);

      } catch (error) {
        console.error(`❌ Erreur ${filePath}:`, error.message);
      }
    });

    // Écrire le fichier final
    const outputFile = path.join(OUTPUT_DIR, `${lang}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(mergedTranslations, null, 2));
  });

  console.log(`🎉 Fusion i18n terminée pour ${projectName} !`);
}

// Script principal
const project = process.argv[2];
if (project) {
  mergeTranslations(project);
} else {
  console.log('Usage: node merge-i18n.js <project-name>');
  console.log('Exemple: node merge-i18n.js client');
  console.log('         node merge-i18n.js back-office');
}
