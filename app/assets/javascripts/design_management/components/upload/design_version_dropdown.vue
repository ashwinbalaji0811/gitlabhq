<script>
import { GlNewDropdown, GlNewDropdownItem } from '@gitlab/ui';
import { __, sprintf } from '~/locale';
import allVersionsMixin from '../../mixins/all_versions';
import { findVersionId } from '../../utils/design_management_utils';

export default {
  components: {
    GlNewDropdown,
    GlNewDropdownItem,
  },
  mixins: [allVersionsMixin],
  computed: {
    queryVersion() {
      return this.$route.query.version;
    },
    currentVersionIdx() {
      if (!this.queryVersion) return 0;

      const idx = this.allVersions.findIndex(
        version => this.findVersionId(version.id) === this.queryVersion,
      );

      // if the currentVersionId isn't a valid version (i.e. not in allVersions)
      // then return the latest version (index 0)
      return idx !== -1 ? idx : 0;
    },
    currentVersionId() {
      if (this.queryVersion) return this.queryVersion;

      const currentVersion = this.allVersions[this.currentVersionIdx];
      return this.findVersionId(currentVersion.id);
    },
    dropdownText() {
      if (this.isLatestVersion) {
        return __('Showing Latest Version');
      }
      // allVersions is sorted in reverse chronological order (latest first)
      const currentVersionNumber = this.allVersions.length - this.currentVersionIdx;

      return sprintf(__('Showing Version #%{versionNumber}'), {
        versionNumber: currentVersionNumber,
      });
    },
  },
  methods: {
    findVersionId,
  },
};
</script>

<template>
  <gl-new-dropdown :text="dropdownText" size="small" class="design-version-dropdown">
    <gl-new-dropdown-item v-for="(version, index) in allVersions" :key="version.id">
      <router-link
        class="d-flex js-version-link"
        :to="{ path: $route.path, query: { version: findVersionId(version.id) } }"
      >
        <div class="flex-grow-1 ml-2">
          <div>
            <strong
              >{{ __('Version') }} {{ allVersions.length - index }}
              <span v-if="findVersionId(version.id) === latestVersionId">({{ __('latest') }})</span>
            </strong>
          </div>
        </div>
        <i
          v-if="findVersionId(version.id) === currentVersionId"
          class="fa fa-check float-right gl-mr-2"
        ></i>
      </router-link>
    </gl-new-dropdown-item>
  </gl-new-dropdown>
</template>
