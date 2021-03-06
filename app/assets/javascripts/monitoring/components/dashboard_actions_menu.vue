<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import {
  GlDeprecatedButton,
  GlNewDropdown,
  GlNewDropdownDivider,
  GlNewDropdownItem,
  GlModal,
  GlIcon,
  GlModalDirective,
  GlTooltipDirective,
} from '@gitlab/ui';
import CustomMetricsFormFields from '~/custom_metrics/components/custom_metrics_form_fields.vue';
import glFeatureFlagsMixin from '~/vue_shared/mixins/gl_feature_flags_mixin';
import { PANEL_NEW_PAGE } from '../router/constants';
import DuplicateDashboardModal from './duplicate_dashboard_modal.vue';
import CreateDashboardModal from './create_dashboard_modal.vue';
import { s__ } from '~/locale';
import invalidUrl from '~/lib/utils/invalid_url';
import { redirectTo } from '~/lib/utils/url_utility';
import TrackEventDirective from '~/vue_shared/directives/track_event';
import { getAddMetricTrackingOptions } from '../utils';

export default {
  components: {
    GlDeprecatedButton,
    GlNewDropdown,
    GlNewDropdownDivider,
    GlNewDropdownItem,
    GlModal,
    GlIcon,
    DuplicateDashboardModal,
    CreateDashboardModal,
    CustomMetricsFormFields,
  },
  directives: {
    GlModal: GlModalDirective,
    GlTooltip: GlTooltipDirective,
    TrackEvent: TrackEventDirective,
  },
  mixins: [glFeatureFlagsMixin()],
  props: {
    addingMetricsAvailable: {
      type: Boolean,
      required: false,
      default: false,
    },
    customMetricsPath: {
      type: String,
      required: false,
      default: invalidUrl,
    },
    validateQueryPath: {
      type: String,
      required: false,
      default: invalidUrl,
    },
    defaultBranch: {
      type: String,
      required: true,
    },
    isOotbDashboard: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return { customMetricsFormIsValid: null };
  },
  computed: {
    ...mapState('monitoringDashboard', [
      'projectPath',
      'isUpdatingStarredValue',
      'addDashboardDocumentationPath',
    ]),
    ...mapGetters('monitoringDashboard', ['selectedDashboard']),
    isOutOfTheBoxDashboard() {
      return this.selectedDashboard?.out_of_the_box_dashboard;
    },
    isMenuItemEnabled() {
      return {
        addPanel: !this.isOotbDashboard,
        createDashboard: Boolean(this.projectPath),
        editDashboard: this.selectedDashboard?.can_edit,
      };
    },
    isMenuItemShown() {
      return {
        addPanel: this.glFeatures.metricsDashboardNewPanelPage,
        duplicateDashboard: this.isOutOfTheBoxDashboard,
      };
    },
    newPanelPageLocation() {
      // Retains params/query if any
      const { params, query } = this.$route ?? {};
      return { name: PANEL_NEW_PAGE, params, query };
    },
  },
  methods: {
    ...mapActions('monitoringDashboard', ['toggleStarredValue']),
    setFormValidity(isValid) {
      this.customMetricsFormIsValid = isValid;
    },
    hideAddMetricModal() {
      this.$refs.addMetricModal.hide();
    },
    getAddMetricTrackingOptions,
    submitCustomMetricsForm() {
      this.$refs.customMetricsForm.submit();
    },
    selectDashboard(dashboard) {
      // Once the sidebar See metrics link is updated to the new URL,
      // this sort of hardcoding will not be necessary.
      // https://gitlab.com/gitlab-org/gitlab/-/issues/229277
      const baseURL = `${this.projectPath}/-/metrics`;
      const dashboardPath = encodeURIComponent(
        dashboard.out_of_the_box_dashboard ? dashboard.path : dashboard.display_name,
      );
      redirectTo(`${baseURL}/${dashboardPath}`);
    },
  },

  modalIds: {
    addMetric: 'addMetric',
    createDashboard: 'createDashboard',
    duplicateDashboard: 'duplicateDashboard',
  },
  i18n: {
    actionsMenu: s__('Metrics|More actions'),
    duplicateDashboard: s__('Metrics|Duplicate current dashboard'),
    starDashboard: s__('Metrics|Star dashboard'),
    unstarDashboard: s__('Metrics|Unstar dashboard'),
    addMetric: s__('Metrics|Add metric'),
    addPanel: s__('Metrics|Add panel'),
    addPanelInfo: s__('Metrics|Duplicate this dashboard to add panel or edit dashboard YAML.'),
    editDashboardInfo: s__('Metrics|Duplicate this dashboard to add panel or edit dashboard YAML.'),
    editDashboard: s__('Metrics|Edit dashboard YAML'),
    createDashboard: s__('Metrics|Create new dashboard'),
  },
};
</script>

<template>
  <gl-new-dropdown
    v-gl-tooltip
    data-testid="actions-menu"
    data-qa-selector="actions_menu_dropdown"
    right
    no-caret
    toggle-class="gl-px-3!"
    :title="$options.i18n.actionsMenu"
  >
    <template #button-content>
      <gl-icon class="gl-mr-0!" name="ellipsis_v" />
    </template>

    <template v-if="addingMetricsAvailable">
      <gl-new-dropdown-item
        v-gl-modal="$options.modalIds.addMetric"
        data-qa-selector="add_metric_button"
        data-testid="add-metric-item"
      >
        {{ $options.i18n.addMetric }}
      </gl-new-dropdown-item>
      <gl-modal
        ref="addMetricModal"
        :modal-id="$options.modalIds.addMetric"
        :title="$options.i18n.addMetric"
        data-testid="add-metric-modal"
      >
        <form ref="customMetricsForm" :action="customMetricsPath" method="post">
          <custom-metrics-form-fields
            :validate-query-path="validateQueryPath"
            form-operation="post"
            @formValidation="setFormValidity"
          />
        </form>
        <div slot="modal-footer">
          <gl-deprecated-button @click="hideAddMetricModal">
            {{ __('Cancel') }}
          </gl-deprecated-button>
          <gl-deprecated-button
            v-track-event="getAddMetricTrackingOptions()"
            data-testid="add-metric-modal-submit-button"
            :disabled="!customMetricsFormIsValid"
            variant="success"
            @click="submitCustomMetricsForm"
          >
            {{ __('Save changes') }}
          </gl-deprecated-button>
        </div>
      </gl-modal>
    </template>

    <template v-if="isMenuItemShown.addPanel">
      <gl-new-dropdown-item
        v-if="isMenuItemEnabled.addPanel"
        data-testid="add-panel-item-enabled"
        :to="newPanelPageLocation"
      >
        {{ $options.i18n.addPanel }}
      </gl-new-dropdown-item>

      <!--
        wrapper for tooltip as button can be `disabled`
        https://bootstrap-vue.org/docs/components/tooltip#disabled-elements
        -->
      <div v-else v-gl-tooltip :title="$options.i18n.addPanelInfo">
        <gl-new-dropdown-item
          :alt="$options.i18n.addPanelInfo"
          :to="newPanelPageLocation"
          data-testid="add-panel-item-disabled"
          disabled
          class="gl-cursor-not-allowed"
        >
          <span class="gl-text-gray-400">{{ $options.i18n.addPanel }}</span>
        </gl-new-dropdown-item>
      </div>
    </template>

    <gl-new-dropdown-item
      v-if="isMenuItemEnabled.editDashboard"
      :href="selectedDashboard ? selectedDashboard.project_blob_path : null"
      data-qa-selector="edit_dashboard_button_enabled"
      data-testid="edit-dashboard-item-enabled"
    >
      {{ $options.i18n.editDashboard }}
    </gl-new-dropdown-item>

    <!--
      wrapper for tooltip as button can be `disabled`
      https://bootstrap-vue.org/docs/components/tooltip#disabled-elements
      -->
    <div v-else v-gl-tooltip :title="$options.i18n.editDashboardInfo">
      <gl-new-dropdown-item
        :alt="$options.i18n.editDashboardInfo"
        :href="selectedDashboard ? selectedDashboard.project_blob_path : null"
        data-testid="edit-dashboard-item-disabled"
        disabled
        class="gl-cursor-not-allowed"
      >
        <span class="gl-text-gray-400">{{ $options.i18n.editDashboard }}</span>
      </gl-new-dropdown-item>
    </div>

    <template v-if="isMenuItemShown.duplicateDashboard">
      <gl-new-dropdown-item
        v-gl-modal="$options.modalIds.duplicateDashboard"
        data-testid="duplicate-dashboard-item"
      >
        {{ $options.i18n.duplicateDashboard }}
      </gl-new-dropdown-item>

      <duplicate-dashboard-modal
        :default-branch="defaultBranch"
        :modal-id="$options.modalIds.duplicateDashboard"
        data-testid="duplicate-dashboard-modal"
        @dashboardDuplicated="selectDashboard"
      />
    </template>

    <gl-new-dropdown-item
      v-if="selectedDashboard"
      data-testid="star-dashboard-item"
      :disabled="isUpdatingStarredValue"
      @click="toggleStarredValue()"
    >
      {{ selectedDashboard.starred ? $options.i18n.unstarDashboard : $options.i18n.starDashboard }}
    </gl-new-dropdown-item>

    <gl-new-dropdown-divider />

    <gl-new-dropdown-item
      v-gl-modal="$options.modalIds.createDashboard"
      data-testid="create-dashboard-item"
      :disabled="!isMenuItemEnabled.createDashboard"
      :class="{ 'monitoring-actions-item-disabled': !isMenuItemEnabled.createDashboard }"
    >
      {{ $options.i18n.createDashboard }}
    </gl-new-dropdown-item>

    <template v-if="isMenuItemEnabled.createDashboard">
      <create-dashboard-modal
        data-testid="create-dashboard-modal"
        :add-dashboard-documentation-path="addDashboardDocumentationPath"
        :modal-id="$options.modalIds.createDashboard"
        :project-path="projectPath"
      />
    </template>
  </gl-new-dropdown>
</template>
