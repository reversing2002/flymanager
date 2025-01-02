const puppeteer = require('puppeteer');
const fs = require('fs');

///////////////////////////////////////////////////
// 1) Tableau de correspondances (ajout de champs supplémentaires)
///////////////////////////////////////////////////


const fieldMap = {
    // --- PAGE DE LOGIN ---
    username: {
      selector: '#A2',
      type: 'text',
      label: 'Identifiant (login)'
    },
    password: {
      selector: '#A4',
      type: 'text',
      label: 'Mot de passe'
    },
    loginButton: {
      selector: '#A10',
      type: 'button',
      label: 'Bouton connexion'
    },
  
  
    // --- INFOS PERSONNELLES ---
    numeroLicence: {
      selector: '#A515',
      type: 'text',
      label: 'N° Licence FFA'
    },
    civilite: {
      selector: '#A518',
      type: 'select',
      label: 'Civilité'
    },
    nom: {
      selector: '#A519',
      type: 'text',
      label: 'Nom'
    },
    prenom: {
      selector: '#A517',
      type: 'text',
      label: 'Prénom'
    },
    dateNaissance: {
      selector: '#A520',
      type: 'text',
      label: 'Date de naissance'
    },
  
    // --- CONTACT ET ADRESSES ---
    adresse1: {
      selector: '#A528',
      type: 'text',
      label: 'Adresse (ligne 1)'
    },
    adresse2: {
      selector: '#A530',
      type: 'text',
      label: 'Adresse (ligne 2)'
    },
    adresse3: {
      selector: '#A535',
      type: 'text',
      label: 'Adresse (ligne 3)'
    },
    codePostal: {
      selector: '#A540',
      type: 'text',
      label: 'Code postal'
    },
    ville: {
      selector: '#A539',
      type: 'text',
      label: 'Ville'
    },
    pays: {
      selector: '#A586',
      type: 'select',
      label: 'Pays'
    },
    profession: {
      selector: '#A587',
      type: 'select',
      label: 'Profession'
    },
    email: {
      selector: '#A590',
      type: 'text',
      label: 'Email'
    },
    telephoneMobile: {
      selector: '#A583',
      type: 'text',
      label: 'Téléphone mobile'
    },
    telephoneDomicile: {
      selector: '#A584',
      type: 'text',
      label: 'Téléphone domicile'
    },
    telephoneTravail: {
      selector: '#A585',
      type: 'text',
      label: 'Téléphone travail'
    },
  
    // --- LICENCES DGAC ET VALIDITÉS ---
    licencePPL: {
      selector: '#A594',
      type: 'text',
      label: 'N° PPL'
    },
    licenceLAPL: {
      selector: '#A591',
      type: 'text',
      label: 'N° LAPL'
    },
    licenceCA: {
      selector: '#A592',
      type: 'text',
      label: 'N° CPL (CA)'
    },
    licenceA: {
      selector: '#A593',
      type: 'text',
      label: 'N° ATPL (A)'
    },
  
    // --- FI ET AUTRES QUALIFICATIONS ---
    numeroFI: {
        selector: '#A576',
        type: 'text',
        label: 'N° FI(A)'
      },
      validiteFI: {
        selector: '#A555',
        type: 'text',
        label: 'Validité FI(A)'
      },
      numeroFE: {
        selector: '#A513',
        type: 'text',
        label: 'N° FE'
      },
      validiteFE: {
        selector: '#A568',
        type: 'text',
        label: 'Validité FE'
      },
    numeroCRI: {
      selector: '#A562',
      type: 'text',
      label: 'N° CRI'
    },
    validiteCRI: {
      selector: '#A511',
      type: 'text',
      label: 'Validité CRI'
    },
  
    // --- QUALIFICATIONS PILOTE (cases à cocher) ---
    qcSepT: {
      selector: '#A442_1',
      type: 'checkbox',
      label: 'Qualification SEP(T)'
    },
    validiteSepT: {
      selector: '#A430',
      type: 'text',
      label: 'Validité SEP(T)'
    },
    qcSepHydro: {
      selector: '#A435_1',
      type: 'checkbox',
      label: 'Qualification SEP(Hydro)'
    },
    validiteSepHydro: {
      selector: '#A428',
      type: 'text',
      label: 'Validité SEP(Hydro)'
    },
    qcSepTmg: {
      selector: '#A432_1',
      type: 'checkbox',
      label: 'Qualification SEP(TMG)'
    },
    validiteSepTmg: {
      selector: '#A427',
      type: 'text',
      label: 'Validité SEP(TMG)'
    },
  
    // --- QUALIFICATIONS SPÉCIALES ---
    nuit: {
      selector: '#A549_1',
      type: 'checkbox',
      label: 'Qualification Nuit'
    },
    voltige: {
      selector: '#A546_1',
      type: 'checkbox',
      label: 'Qualification Voltige'
    },

  

  };

  async function getFieldValue(page, selector, type) {
    try {
      switch (type) {
        case 'text':
        case 'password':
          return await page.$eval(selector, el => el.value || el.textContent.trim());
  
        case 'select':
          return await page.$eval(selector, el => {
            const idx = el.selectedIndex;
            if (idx < 0) return '';
            return el.options[idx].text;
          });
  
        case 'checkbox':
          return await page.$eval(selector, el => el.checked);
  
        case 'button':
          return null;
  
        default:
          return await page.$eval(selector, el => el.value || el.textContent.trim());
      }
    } catch (error) {
      if (type === 'checkbox') return false;
      return '';
    }
  }
async function extractAllInputs(page, fieldMap) {
  const result = {};
  for (const [key, config] of Object.entries(fieldMap)) {
    const { selector, type, label } = config;
    const value = await getFieldValue(page, selector, type);
    // On stocke { label, value } ou juste value selon vos goûts
    result[key] = { label, value };
  }
  return result;
}

// ---- Script principal ----
(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new', 
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Aller sur la page
    await page.goto('https://smile.ff-aero.fr/SMILE_II/', { waitUntil: 'networkidle2' });

    // Taper le user/pwd
    await page.type(fieldMap.username.selector, '7822034'); // Par exemple
    await page.type(fieldMap.password.selector, 'NkmULrxWP@E4m7g');

    // Cliquer sur "Connexion"
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click(fieldMap.loginButton.selector)
    ]);

    // Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pour attendre 1 seconde

    // Extraire la totalité
    const allData = await extractAllInputs(page, fieldMap);

    // Sauvegarder en JSON
    const jsonData = JSON.stringify(allData, null, 2);
    fs.writeFileSync('pilot_data.json', jsonData, 'utf8');
    console.log('Extraction complète effectuée, voici un aperçu :');
    console.log(jsonData);

  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();