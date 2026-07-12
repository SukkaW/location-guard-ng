import type { Level } from 'location-guard-types';
import { getEffectiveLevel, getSiteOverride, setSiteLevel } from '../site-levels';
import { getStoredValueAsync } from '../storage';
import { tagged as css } from 'foxts/tagged';

function formatRadius(meters: number): string {
  return meters >= 1000 ? `${Number((meters / 1000).toFixed(2))} km` : `${meters} m`;
}

export async function openSiteLevelPicker(onSaved?: () => void): Promise<void> {
  const { hostname } = window.location;
  if (!hostname) return;

  const [defaultLevel, effectiveLevel, override, levels] = await Promise.all([
    getStoredValueAsync('defaultLevel'),
    getEffectiveLevel(hostname),
    getSiteOverride(hostname),
    getStoredValueAsync('levels')
  ]);

  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = css`
    dialog {
      font: 14px/1.6 system-ui, sans-serif;
      padding: 16px 20px;
      max-width: 22em;
    }
    label { display: block; }
    fieldset { margin: 0 0 8px; border: none; padding: 0; }
    .scope-hint { margin: 0 0 0 1.6em; opacity: 0.7; font-size: 0.92em; }
    .buttons { text-align: right; }
    .buttons button { margin-left: 8px; }
  `;

  const dialog = document.createElement('dialog');
  const form = document.createElement('form');
  form.method = 'dialog';

  const title = document.createElement('p');
  const titleHostname = document.createElement('b');
  titleHostname.textContent = hostname;
  title.append('Privacy level for ', titleHostname, ` (currently: ${effectiveLevel})`);

  const levelFieldset = document.createElement('fieldset');
  const selectedLevel = override ? override.level : '';
  const levelOptions: Array<[Level | '', string]> = [
    ['', `Use default (${defaultLevel})`],
    ['fixed', 'Use fixed location'],
    ['high', `High (±${formatRadius(levels.high.radius)} noise)`],
    ['medium', `Medium (±${formatRadius(levels.medium.radius)} noise)`],
    ['low', `Low (±${formatRadius(levels.low.radius)} noise)`],
    ['real', 'Use real location']
  ];
  for (const [value, text] of levelOptions) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'level';
    radio.value = value;
    radio.checked = value === selectedLevel;
    label.append(radio, ` ${text}`);
    levelFieldset.append(label);
  }

  const subdomainFieldset = document.createElement('fieldset');
  const subdomainLabel = document.createElement('label');
  const subdomainCheckbox = document.createElement('input');
  subdomainCheckbox.type = 'checkbox';
  subdomainCheckbox.checked = override ? override.includeSubdomain : true;
  subdomainLabel.append(subdomainCheckbox, ' Include all subdomains');
  const scopeHint = document.createElement('p');
  scopeHint.className = 'scope-hint';
  const updateScopeHint = () => {
    scopeHint.textContent = subdomainCheckbox.checked
      ? `applies to *.${hostname} + ${hostname}`
      : `applies to ${hostname} exact only`;
  };
  updateScopeHint();
  subdomainCheckbox.addEventListener('change', updateScopeHint);
  subdomainFieldset.append(subdomainLabel, scopeHint);

  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  const cancelButton = document.createElement('button');
  cancelButton.value = 'cancel';
  cancelButton.textContent = 'Cancel';
  const saveButton = document.createElement('button');
  saveButton.value = 'save';
  saveButton.textContent = 'Save';
  buttons.append(cancelButton, saveButton);

  form.append(title, levelFieldset, subdomainFieldset, buttons);
  dialog.append(form);
  shadow.append(style, dialog);

  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'save') {
      const checked = form.querySelector('input[name="level"]:checked');
      const level = checked?.value ?? '';
      void setSiteLevel(hostname, level === '' ? null : level as Level, subdomainCheckbox.checked)
        .then(() => onSaved?.());
    }
    host.remove();
  });

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- lib.dom lies, document.body is null in XML/SVG documents
  (document.body ?? document.documentElement).append(host);
  dialog.showModal();
}
