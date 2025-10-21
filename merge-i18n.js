const fs = require('fs-extra');
const path = require('path');

function copySharedI18nToProjects() {
  const SHARED_I18N_SOURCE = './projects/shared-lib/src/lib/assets/shared-i18n';
  const PROJECTS = ['client', 'back-office'];

  // Vérifier si le dossier source existe
  if (!fs.existsSync(SHARED_I18N_SOURCE)) {
    console.error('❌ Dossier shared-i18n source introuvable:', SHARED_I18N_SOURCE);
    return;
  }

  PROJECTS.forEach(projectName => {
    const targetDir = `./projects/${projectName}/public/assets/i18n/modules/shared-autogerated`;

    try {
      // Supprimer l'ancien dossier s'il existe
      if (fs.existsSync(targetDir)) {
        fs.removeSync(targetDir);
      }

      // Créer le dossier de destination
      fs.ensureDirSync(targetDir);

      // Copier le contenu du dossier shared-i18n
      fs.copySync(SHARED_I18N_SOURCE, targetDir, {
        overwrite: true,
        preserveTimestamps: true
      });

      console.log(`Shared-i18n copié vers ${projectName}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la copie vers ${projectName}:`, error.message);
    }
  });
}

// Script pour exécuter la copie puis la fusion
function updateProjectTranslations(projectName) {
  // 1. Copier les traductions partagées (avec suppression de l'ancien)
  copySharedI18nToProjects();
  // 2. Fusionner les traductions
  mergeTranslations(projectName);
  console.log(`🎉 Mise à jour complète terminée pour ${projectName} !`);
}

// Votre fonction mergeTranslations existante
function mergeTranslations(projectName) {
  const SOURCE_DIR = `./projects/${projectName}/public/assets/i18n/modules`;
  const OUTPUT_DIR = `./projects/${projectName}/public/assets/i18n/lang`;
  const LANGUAGES = ['fr', 'en'];

  if (!fs.existsSync(SOURCE_DIR)) {
    return;
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  function findTranslationFiles(dir, lang) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach(item => {
      const itemPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...findTranslationFiles(itemPath, lang));
      } else if (item.isFile() && item.name.endsWith(`.${lang}.json`)) {
        files.push(itemPath);
      }
    });

    return files;
  }

  LANGUAGES.forEach(lang => {
    const mergedTranslations = {};
    const translationFiles = findTranslationFiles(SOURCE_DIR, lang);

    translationFiles.forEach(filePath => {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        Object.assign(mergedTranslations, content);
      } catch (error) {
        console.error(`❌ Erreur ${filePath}:`, error.message);
      }
    });

    const outputFile = path.join(OUTPUT_DIR, `${lang}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(mergedTranslations, null, 2));
  });

  console.log(`🎉 Fusion i18n terminée pour ${projectName} !`);
}

// Utilisation
const project = process.argv[2];
if (project) {
  if (process.argv[3] === '--copy-only') {
    // Copie seulement les fichiers partagés (avec suppression)
    copySharedI18nToProjects();
  } else {
    // Copie + fusion complète
    updateProjectTranslations(project);
  }
} else {
  console.log('Usage:');
  console.log('  node merge-i18n.js <project-name>          # Supprime ancien + copie shared-i18n + fusion');
  console.log('  node merge-i18n.js <project-name> --copy-only  # Supprime ancien + copie shared-i18n seulement');
  console.log('');
  console.log('Exemples:');
  console.log('  node merge-i18n.js client');
  console.log('  node merge-i18n.js back-office --copy-only');
}
