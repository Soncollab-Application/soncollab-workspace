import {Component, signal} from '@angular/core';
import {ReactiveFormsModule, } from '@angular/forms';
import {CommonModule} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import  { ChoiceOption, ChoiceConfig, ChoiceGroup , Choice } from 'shared-lib';

interface TestUser {
  documentId: string;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

@Component({
  selector: 'app-test-components',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    Choice
  ],
  templateUrl: './test-components.html',
  styleUrls: ['./test-components.css']
})
export class TestComponents {
  // === Test 1: Basic Select ===
  basicOptions = signal<ChoiceOption[]>([
    { value: 'Emily Johnson', label: 'Emily Johnson' },
    { value: 'Michael Davis', label: 'Michael Davis' },
    { value: 'Jessica Smith', label: 'Jessica Smith' },
    { value: 'Christopher Taylor', label: 'Christopher Taylor' },
    { value: 'Olivia Anderson', label: 'Olivia Anderson' },
    { value: 'Ethan Williams', label: 'Ethan Williams' }
  ]);

  selectedBasic = signal<string>('');

  // === Test 2: Search with Option Groups ===
  countryGroups = signal<ChoiceGroup[]>([
    {
      label: 'Africa',
      choices: [
        { value: 'Nigeria', label: 'Nigeria' },
        { value: 'South Africa', label: 'South Africa' },
        { value: 'Kenya', label: 'Kenya' },
        { value: 'Egypt', label: 'Egypt' },
        { value: 'Ethiopia', label: 'Ethiopia' }
      ]
    },
    {
      label: 'Asia',
      choices: [
        { value: 'China', label: 'China' },
        { value: 'India', label: 'India' },
        { value: 'Japan', label: 'Japan' },
        { value: 'South Korea', label: 'South Korea' },
        { value: 'Saudi Arabia', label: 'Saudi Arabia' }
      ]
    },
    {
      label: 'Europe',
      choices: [
        { value: 'Germany', label: 'Germany' },
        { value: 'France', label: 'France' },
        { value: 'United Kingdom', label: 'United Kingdom' },
        { value: 'Italy', label: 'Italy' },
        { value: 'Spain', label: 'Spain' }
      ]
    },
    {
      label: 'North America',
      choices: [
        { value: 'United States', label: 'United States' },
        { value: 'Canada', label: 'Canada' },
        { value: 'Mexico', label: 'Mexico' },
        { value: 'Jamaica', label: 'Jamaica' },
        { value: 'Costa Rica', label: 'Costa Rica' }
      ]
    }
  ]);

  searchConfig = signal<ChoiceConfig>({
    searchEnabled: true
  });

  selectedCountry = signal<string>('');

  // === Test 3: Multiple Select ===
  cmsOptions = signal<ChoiceOption[]>([
    { value: 'Shopify', label: 'Shopify', selected: true },
    { value: 'WooCommerce', label: 'WooCommerce' },
    { value: 'Magento', label: 'Magento' },
    { value: 'OpenCart', label: 'OpenCart' },
    { value: 'PrestaShop', label: 'PrestaShop' },
    { value: 'VirtueMart', label: 'VirtueMart' }
  ]);

  selectedCms = signal<string[]>([]);

  // === Test 4: Tags Input ===
  tagsConfig = signal<ChoiceConfig>({
    placeholderValue: 'Enter something',
    delimiter: ',',
    editItems: true,
    removeItemButton: true
  });

  tags = signal<string[]>([]);

  // === Test 5: Custom Template (Language with flags) ===
  languageConfig = signal<ChoiceConfig>({
    placeholderValue: 'Select language',
    allowHTML: true,
    choices: [
      {
        value: '',
        label: 'Select language',
        placeholder: true
      },
      {
        value: 'English',
        label: '<div class="d-flex align-items-center"><img src="assets/img/flags/en-uk.png" class="flex-shrink-0 me-2" width="20" alt="English"> English</div>',
        selected: true
      },
      {
        value: 'Français',
        label: '<div class="d-flex align-items-center"><img src="assets/img/flags/fr.png" class="flex-shrink-0 me-2" width="20" alt="Français"> Français</div>'
      },
      {
        value: 'Deutsch',
        label: '<div class="d-flex align-items-center"><img src="assets/img/flags/de.png" class="flex-shrink-0 me-2" width="20" alt="Deutsch"> Deutsch</div>'
      },
      {
        value: 'Italiano',
        label: '<div class="d-flex align-items-center"><img src="assets/img/flags/it.png" class="flex-shrink-0 me-2" width="20" alt="Italiano"> Italiano</div>'
      }
    ]
  });

  selectedLanguage = signal<string>('English');

  // === Test 6: Sizes ===
  sizeOptions = signal<ChoiceOption[]>([
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' }
  ]);

  largeConfig = signal<ChoiceConfig>({
    classNames: {
      containerInner: ['form-select', 'form-select-lg']
    }
  });

  smallConfig = signal<ChoiceConfig>({
    classNames: {
      containerInner: ['form-select', 'form-select-sm']
    }
  });

  pillLargeConfig = signal<ChoiceConfig>({
    classNames: {
      containerInner: ['form-select', 'form-select-lg', 'rounded-pill']
    }
  });

  pillConfig = signal<ChoiceConfig>({
    classNames: {
      containerInner: ['form-select', 'rounded-pill']
    }
  });

  pillSmallConfig = signal<ChoiceConfig>({
    classNames: {
      containerInner: ['form-select', 'form-select-sm', 'rounded-pill']
    }
  });

  squareLargeConfig = signal<ChoiceConfig>({
    classNames: {
      containerInner: ['form-select', 'form-select-lg', 'rounded-0']
    }
  });

  squareConfig = signal<ChoiceConfig>({
    classNames: {
      containerInner: ['form-select', 'rounded-0']
    }
  });

  squareSmallConfig = signal<ChoiceConfig>({
    classNames: {
      containerInner: ['form-select', 'form-select-sm', 'rounded-0']
    }
  });

  // === Test 7: Disabled ===
  isDisabled = signal<boolean>(true);

  // Handlers
  onBasicChange(value: any) {
    console.log('Basic select:', value);
    this.selectedBasic.set(value);
  }

  onCountryChange(value: any) {
    console.log('Country select:', value);
    this.selectedCountry.set(value);
  }

  onCmsChange(value: any) {
    console.log('CMS select:', value);
    this.selectedCms.set(Array.isArray(value) ? value : [value]);
  }

  onTagsChange(value: any) {
    console.log('Tags:', value);
    this.tags.set(Array.isArray(value) ? value : [value]);
  }

  onLanguageChange(value: any) {
    console.log('Language:', value);
    this.selectedLanguage.set(value);
  }

  toggleDisabled() {
    this.isDisabled.update(v => !v);
  }
}
