<script>
import $ from 'jquery';
import '~/behaviors/markdown/render_gfm';
import { unescape } from 'lodash';
import { __, sprintf } from '~/locale';
import { stripHtml } from '~/lib/utils/text_utility';
import Flash from '~/flash';
import GLForm from '~/gl_form';
import MarkdownHeader from './header.vue';
import MarkdownToolbar from './toolbar.vue';
import Icon from '../icon.vue';
import GlMentions from '~/vue_shared/components/gl_mentions.vue';
import Suggestions from '~/vue_shared/components/markdown/suggestions.vue';
import glFeatureFlagsMixin from '~/vue_shared/mixins/gl_feature_flags_mixin';
import axios from '~/lib/utils/axios_utils';

export default {
  components: {
    GlMentions,
    MarkdownHeader,
    MarkdownToolbar,
    Icon,
    Suggestions,
  },
  mixins: [glFeatureFlagsMixin()],
  props: {
    isSubmitting: {
      type: Boolean,
      required: false,
      default: false,
    },
    markdownPreviewPath: {
      type: String,
      required: false,
      default: '',
    },
    markdownDocsPath: {
      type: String,
      required: true,
    },
    addSpacingClasses: {
      type: Boolean,
      required: false,
      default: true,
    },
    quickActionsDocsPath: {
      type: String,
      required: false,
      default: '',
    },
    canAttachFile: {
      type: Boolean,
      required: false,
      default: true,
    },
    enableAutocomplete: {
      type: Boolean,
      required: false,
      default: true,
    },
    line: {
      type: Object,
      required: false,
      default: null,
    },
    note: {
      type: Object,
      required: false,
      default: () => ({}),
    },
    canSuggest: {
      type: Boolean,
      required: false,
      default: false,
    },
    helpPagePath: {
      type: String,
      required: false,
      default: '',
    },
    showSuggestPopover: {
      type: Boolean,
      required: false,
      default: false,
    },
    // This prop is used as a fallback in case if textarea.elm is undefined
    textareaValue: {
      type: String,
      required: false,
      default: '',
    },
  },
  data() {
    return {
      markdownPreview: '',
      referencedCommands: '',
      referencedUsers: '',
      hasSuggestion: false,
      markdownPreviewLoading: false,
      previewMarkdown: false,
      suggestions: this.note.suggestions || [],
    };
  },
  computed: {
    shouldShowReferencedUsers() {
      const referencedUsersThreshold = 10;
      return this.referencedUsers.length >= referencedUsersThreshold;
    },
    lineContent() {
      const [firstSuggestion] = this.suggestions;
      if (firstSuggestion) {
        return firstSuggestion.from_content;
      }

      if (this.line) {
        const { rich_text: richText, text } = this.line;

        if (text) {
          return text;
        }

        return unescape(stripHtml(richText).replace(/\n/g, ''));
      }

      return '';
    },
    lineNumber() {
      let lineNumber;
      if (this.line) {
        const { new_line: newLine, old_line: oldLine } = this.line;
        lineNumber = newLine || oldLine;
      }
      return lineNumber;
    },
    lineType() {
      return this.line ? this.line.type : '';
    },
    addMultipleToDiscussionWarning() {
      return sprintf(
        __(
          '%{icon}You are about to add %{usersTag} people to the discussion. They will all receive a notification.',
        ),
        {
          icon: '<i class="fa fa-exclamation-triangle" aria-hidden="true"></i>',
          usersTag: `<strong><span class="js-referenced-users-count">${this.referencedUsers.length}</span></strong>`,
        },
        false,
      );
    },
  },
  watch: {
    isSubmitting(isSubmitting) {
      if (!isSubmitting || !this.$refs['markdown-preview'].querySelectorAll) {
        return;
      }
      const mediaInPreview = this.$refs['markdown-preview'].querySelectorAll('video, audio');

      if (mediaInPreview) {
        mediaInPreview.forEach(media => {
          media.pause();
        });
      }
    },
  },
  mounted() {
    // GLForm class handles all the toolbar buttons
    return new GLForm($(this.$refs['gl-form']), {
      emojis: this.enableAutocomplete,
      members: this.enableAutocomplete && !this.glFeatures.tributeAutocomplete,
      issues: this.enableAutocomplete,
      mergeRequests: this.enableAutocomplete,
      epics: this.enableAutocomplete,
      milestones: this.enableAutocomplete,
      labels: this.enableAutocomplete && !this.glFeatures.tributeAutocomplete,
      snippets: this.enableAutocomplete,
    });
  },
  beforeDestroy() {
    const glForm = $(this.$refs['gl-form']).data('glForm');
    if (glForm) {
      glForm.destroy();
    }
  },
  methods: {
    showPreviewTab() {
      if (this.previewMarkdown) return;

      this.previewMarkdown = true;

      /*
          Can't use `$refs` as the component is technically in the parent component
          so we access the VNode & then get the element
        */
      const text = this.$slots.textarea[0]?.elm?.value || this.textareaValue;

      if (text) {
        this.markdownPreviewLoading = true;
        this.markdownPreview = __('Loading…');
        axios
          .post(this.markdownPreviewPath, { text })
          .then(response => this.renderMarkdown(response.data))
          .catch(() => new Flash(__('Error loading markdown preview')));
      } else {
        this.renderMarkdown();
      }
    },
    showWriteTab() {
      this.markdownPreview = '';
      this.previewMarkdown = false;
    },

    renderMarkdown(data = {}) {
      this.markdownPreviewLoading = false;
      this.markdownPreview = data.body || __('Nothing to preview.');

      if (data.references) {
        this.referencedCommands = data.references.commands;
        this.referencedUsers = data.references.users;
        this.hasSuggestion = data.references.suggestions && data.references.suggestions.length;
        this.suggestions = data.references.suggestions;
      }

      this.$nextTick()
        .then(() => $(this.$refs['markdown-preview']).renderGFM())
        .catch(() => new Flash(__('Error rendering markdown preview')));
    },
  },
};
</script>

<template>
  <div
    ref="gl-form"
    :class="{ 'gl-mt-3 gl-mb-3': addSpacingClasses }"
    class="js-vue-markdown-field md-area position-relative"
  >
    <markdown-header
      :preview-markdown="previewMarkdown"
      :line-content="lineContent"
      :can-suggest="canSuggest"
      :show-suggest-popover="showSuggestPopover"
      @preview-markdown="showPreviewTab"
      @write-markdown="showWriteTab"
      @handleSuggestDismissed="() => $emit('handleSuggestDismissed')"
    />
    <div v-show="!previewMarkdown" class="md-write-holder">
      <div class="zen-backdrop">
        <gl-mentions v-if="glFeatures.tributeAutocomplete">
          <slot name="textarea"></slot>
        </gl-mentions>
        <slot v-else name="textarea"></slot>
        <a
          class="zen-control zen-control-leave js-zen-leave gl-text-gray-700"
          href="#"
          :aria-label="__('Leave zen mode')"
        >
          <icon :size="16" name="screen-normal" />
        </a>
        <markdown-toolbar
          :markdown-docs-path="markdownDocsPath"
          :quick-actions-docs-path="quickActionsDocsPath"
          :can-attach-file="canAttachFile"
        />
      </div>
    </div>
    <template v-if="hasSuggestion">
      <div
        v-show="previewMarkdown"
        ref="markdown-preview"
        class="js-vue-md-preview md-preview-holder"
      >
        <suggestions
          v-if="hasSuggestion"
          :note-html="markdownPreview"
          :from-line="lineNumber"
          :from-content="lineContent"
          :line-type="lineType"
          :disabled="true"
          :suggestions="suggestions"
          :help-page-path="helpPagePath"
        />
      </div>
    </template>
    <template v-else>
      <div
        v-show="previewMarkdown"
        ref="markdown-preview"
        class="js-vue-md-preview md md-preview-holder"
        v-html="markdownPreview"
      ></div>
    </template>
    <template v-if="previewMarkdown && !markdownPreviewLoading">
      <div v-if="referencedCommands" class="referenced-commands" v-html="referencedCommands"></div>
      <div v-if="shouldShowReferencedUsers" class="referenced-users">
        <span v-html="addMultipleToDiscussionWarning"></span>
      </div>
    </template>
  </div>
</template>
