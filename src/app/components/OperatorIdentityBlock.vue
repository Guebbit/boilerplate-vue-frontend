<script setup lang="ts">
/**
 * @module
 * Who runs the site, read from `GET /config` (`operator`): legal name, address, email, VAT number
 * and, when set, the phone, trade register and its number. The block e-Commerce Directive Art. 5
 * wants "easily, directly and permanently accessible" and GDPR Art. 13(1)(a) wants for the
 * controller: shown on the Terms, Legal notice and Privacy pages. Renders nothing until the
 * config has loaded; it reads the core config, so it works with no shop.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import DefinitionRow from '@/ui/molecules/DefinitionRow.vue';
import { loadConfig, publicConfig } from '@/infrastructure/config.ts';
import { formatAddressLine } from '@/infrastructure/utils/formatters.ts';

/**
 * Translation function for the row labels.
 */
const { t } = useI18n();

/**
 * Asks for the config, which dedupes against the boot-time load: a page opened directly may render
 * before that request has answered.
 */
// eslint-disable-next-line @typescript-eslint/no-floating-promises -- loadConfig never rejects (it logs and leaves the config empty)
void loadConfig();

/**
 * The operator record, or `undefined` while the config is unknown.
 */
const operator = computed(() => publicConfig.value?.operator);

/**
 * The address on one line, the way a letter head prints it.
 */
const addressLine = computed(() => formatAddressLine(operator.value) ?? '');
</script>

<template>
    <dl v-if="operator" class="mb-6" data-test="operator-identity">
        <DefinitionRow :label="t('operator-identity.legal-name')">
            {{ operator.legalName }}
        </DefinitionRow>
        <DefinitionRow :label="t('operator-identity.address')">{{ addressLine }}</DefinitionRow>
        <DefinitionRow :label="t('operator-identity.email')">
            <a :href="`mailto:${operator.email}`" class="underline">{{ operator.email }}</a>
        </DefinitionRow>
        <DefinitionRow v-if="operator.phone" :label="t('operator-identity.phone')">
            {{ operator.phone }}
        </DefinitionRow>
        <DefinitionRow v-if="operator.vatNumber" :label="t('operator-identity.vat-number')">
            {{ operator.vatNumber }}
        </DefinitionRow>
        <DefinitionRow v-if="operator.tradeRegister" :label="t('operator-identity.trade-register')">
            {{ operator.tradeRegister }}
        </DefinitionRow>
        <DefinitionRow
            v-if="operator.registrationNumber"
            :label="t('operator-identity.registration-number')"
        >
            {{ operator.registrationNumber }}
        </DefinitionRow>
    </dl>
</template>
