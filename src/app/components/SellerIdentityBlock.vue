<script setup lang="ts">
/**
 * @module
 * The seller's identity, read from `GET /shop`: legal name, address, email, phone, VAT number and,
 * when the shop has them, the trade register and its number. The block e-Commerce Directive Art. 5
 * wants "easily, directly and permanently accessible", shown at the top of the Terms page and in
 * full on the Legal notice page. Renders nothing until the shop has loaded.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import DefinitionRow from '@/ui/molecules/DefinitionRow.vue';
import { loadShop, shopRecord } from '@/infrastructure/shop.ts';

/**
 * Translation function for the row labels.
 */
const { t } = useI18n();

/**
 * Asks for the shop, which dedupes against the boot-time load: a page opened directly may render
 * before that request has answered.
 */
void loadShop();

/**
 * The address on one line, the way a letter head prints it.
 */
const addressLine = computed(() =>
    shopRecord.value
        ? `${shopRecord.value.street}, ${shopRecord.value.zip} ${shopRecord.value.city}, ${shopRecord.value.country}`
        : ''
);
</script>

<template>
    <dl v-if="shopRecord" class="mb-6" data-test="seller-identity">
        <DefinitionRow :label="t('seller-identity.legal-name')">
            {{ shopRecord.legalName }}
        </DefinitionRow>
        <DefinitionRow :label="t('seller-identity.address')">{{ addressLine }}</DefinitionRow>
        <DefinitionRow :label="t('seller-identity.email')">
            <a :href="`mailto:${shopRecord.email}`" class="underline">{{ shopRecord.email }}</a>
        </DefinitionRow>
        <DefinitionRow :label="t('seller-identity.phone')">{{ shopRecord.phone }}</DefinitionRow>
        <DefinitionRow v-if="shopRecord.vatNumber" :label="t('seller-identity.vat-number')">
            {{ shopRecord.vatNumber }}
        </DefinitionRow>
        <DefinitionRow v-if="shopRecord.tradeRegister" :label="t('seller-identity.trade-register')">
            {{ shopRecord.tradeRegister }}
        </DefinitionRow>
        <DefinitionRow
            v-if="shopRecord.registrationNumber"
            :label="t('seller-identity.registration-number')"
        >
            {{ shopRecord.registrationNumber }}
        </DefinitionRow>
    </dl>
</template>
