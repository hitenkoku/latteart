<!--
 Copyright 2022 NTT Corporation.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
-->

<template>
  <v-layout
    id="operation-list"
    align-space-around
    justify-space-between
    column
    fill-height
  >
    <v-layout align-center style="height: 40px">
      <v-btn @click="resetFilter" color="info" small>{{
        message("operation.reset")
      }}</v-btn>
    </v-layout>
    <v-layout
      align-space-around
      justify-end
      column
      fill-height
      style="height: calc(100% - 90px)"
    >
      <v-flex xs12 :style="{ height: '100%' }">
        <selectable-data-table
          @selectItems="onSelectOperations"
          @contextmenu="openOperationContextMenu"
          :selected-item-indexes="selectedOperationIndexes"
          :disabled-item-indexes="disabledOperationIndexes"
          :headers="headers"
          :items="displayedHistory"
          :filtering-predicates="[operationIsDisplayed, operationContainsText]"
          :shortcut="shortcutEnabled"
          sortBy="operation.sequence"
          descending
          :rowsPerPage="10"
        >
          <template v-slot:row="{ columns }">
            <td class="seq-col">
              {{ columns.operation.sequence }}
            </td>
            <td class="icon-col">
              <v-icon
                v-if="hasIntention(columns.intention)"
                :title="message('app.intention')"
                class="mx-1"
                color="blue"
                >event_note</v-icon
              >
              <v-icon
                v-if="hasNote(columns.notices, columns.bugs)"
                :title="message('app.note')"
                class="mx-1"
                color="purple lighten-3"
                >announcement</v-icon
              >
            </td>
            <td :title="columns.operation.title" class="ellipsis">
              {{
                columns.operation.title
                  ? columns.operation.title.substring(0, 60)
                  : ""
              }}
            </td>
            <td
              :title="
                !!columns.operation.elementInfo
                  ? columns.operation.elementInfo.tagname
                  : ''
              "
              class="ellipsis"
            >
              {{
                !!columns.operation.elementInfo
                  ? columns.operation.elementInfo.tagname
                  : ""
              }}
            </td>
            <td
              :title="
                !!columns.operation.elementInfo
                  ? columns.operation.elementInfo.attributes.name || ''
                  : ''
              "
              class="ellipsis"
            >
              {{
                !!columns.operation.elementInfo
                  ? columns.operation.elementInfo.attributes.name || ""
                  : ""
              }}
            </td>
            <td
              :title="
                !!columns.operation.elementInfo
                  ? columns.operation.elementInfo.text || ''
                  : ''
              "
              class="ellipsis"
            >
              {{
                !!columns.operation.elementInfo
                  ? columns.operation.elementInfo.text
                    ? columns.operation.elementInfo.text.substring(0, 60)
                    : ""
                  : ""
              }}
            </td>
            <td :title="columns.operation.type" class="ellipsis">
              {{ columns.operation.type }}
            </td>
            <td :title="columns.operation.inputValue" class="ellipsis">
              {{ columns.operation.inputValue.substring(0, 60) }}
            </td>
            <td
              :title="formatTimestamp(columns.operation.timestamp)"
              class="ellipsis"
            >
              {{ formatTimestamp(columns.operation.timestamp) }}
            </td>
          </template>
        </selectable-data-table>
      </v-flex>
    </v-layout>

    <v-layout id="operation-search" style="height: 50px">
      <v-text-field
        v-model="search"
        prepend-inner-icon="search"
        :label="message('operation.query')"
        @focus="shortcutEnabled = false"
        @blur="shortcutEnabled = true"
      ></v-text-field>
    </v-layout>

    <operation-context-menu
      :opened="contextMenuOpened"
      :x="contextMenuX"
      :y="contextMenuY"
      :operationInfo="contextMenuInfo"
      @operationContextMenuClose="contextMenuOpened = false"
    />
  </v-layout>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from "vue-property-decorator";
import {
  OperationWithNotes,
  OperationHistory,
  MessageProvider,
  ElementInfo,
} from "@/lib/operationHistory/types";
import OperationContextMenu from "@/vue/pages/captureControl/historyView/OperationContextMenu.vue";
import { Note } from "@/lib/operationHistory/Note";
import { Operation } from "@/lib/operationHistory/Operation";
import SelectableDataTable from "@/vue/molecules/SelectableDataTable.vue";
import { TimestampImpl } from "@/lib/common/Timestamp";

@Component({
  components: {
    "operation-context-menu": OperationContextMenu,
    "selectable-data-table": SelectableDataTable,
  },
})
export default class OperationList extends Vue {
  @Prop({ type: Array, default: [] })
  public readonly history!: OperationHistory;
  @Prop({ type: Number, default: -1 })
  public readonly selectedOperationSequence!: number;
  @Prop({
    type: Function,
    default: () => {
      /* Do nothing */
    },
  })
  public readonly onSelectOperation!: (sequence: number) => void;
  @Prop({ type: Array, default: [] })
  public readonly displayedOperations!: number[];
  @Prop({ type: Function }) public readonly onResetFilter!: () => void;
  @Prop({ type: Function }) public readonly message!: MessageProvider;
  @Prop({ type: Boolean, default: false })
  public readonly operationContextEnabled!: boolean;

  private search = "";
  private selectedSequences: number[] = [];

  private contextMenuOpened = false;
  private contextMenuX = -1;
  private contextMenuY = -1;
  private contextMenuInfo: { sequence: number; selectedSequences: number[] } = {
    sequence: -1,
    selectedSequences: [],
  };

  private shortcutEnabled = true;

  private get headers(): {
    text: string;
    value: string;
    class?: string;
    width?: string;
    sortable?: boolean;
  }[] {
    return [
      {
        text: this.message("operation.sequence"),
        value: "operation.sequence",
        width: "70",
        class: "seq-col",
      },
      {
        text: "",
        value: "",
        class: "icon-col",
        width: "90",
        sortable: false,
      },
      { text: this.message("operation.title"), value: "operation.title" },
      {
        text: this.message("operation.tagname"),
        value: "operation.elementInfo.tagname",
      },
      {
        text: this.message("operation.name"),
        value: "operation.elementInfo.attributes.name",
      },
      {
        text: this.message("operation.text"),
        value: "operation.elementInfo.text",
      },
      { text: this.message("operation.type"), value: "operation.type" },
      { text: this.message("operation.input"), value: "operation.input" },
      {
        text: this.message("operation.timestamp"),
        value: "operation.timestamp",
      },
    ];
  }

  private created() {
    this.initializeSelectedSequences();
  }

  @Watch("selectedOperationSequence")
  private initializeSelectedSequences() {
    this.selectedSequences = [this.selectedOperationSequence];
  }

  private hasIntention(intention: Note | null): boolean {
    return !!intention;
  }

  private hasNote(notices: Note[] | null, bugs: Note[] | null): boolean {
    if (!!notices && notices.length > 0) {
      return true;
    }
    if (!!bugs && bugs.length > 0) {
      return true;
    }
    return false;
  }

  private formatTimestamp(epochMilliseconds: string) {
    return new TimestampImpl(epochMilliseconds).format("HH:mm:ss");
  }

  private operationIsDisplayed(item: OperationWithNotes) {
    if (this.displayedOperations.length === 0) {
      return true;
    }

    return this.displayedOperations.includes(item.operation.sequence);
  }

  private operationContainsText(item: OperationWithNotes): boolean {
    const search = this.search;

    if (
      item.operation.sequence.toString().toLowerCase().indexOf(search) !== -1
    ) {
      return true;
    }
    if (item.operation.title.indexOf(search) !== -1) {
      return true;
    }
    const elementInfo = item.operation.elementInfo;
    if (elementInfo !== null) {
      if (elementInfo.tagname && elementInfo.tagname.indexOf(search) !== -1) {
        return true;
      }
      if (
        elementInfo.attributes.name &&
        elementInfo.attributes.name.indexOf(search) !== -1
      ) {
        return true;
      }
      if (elementInfo.text && elementInfo.text.indexOf(search) !== -1) {
        return true;
      }
    }
    if (item.operation.type.indexOf(search) !== -1) {
      return true;
    }
    if (item.operation.input.indexOf(search) !== -1) {
      return true;
    }
    return false;
  }

  private resetFilter() {
    this.onResetFilter();
  }

  private onSelectOperations(...indexes: number[]) {
    this.selectedSequences = indexes.map((index) => index + 1);

    this.onSelectOperation(this.selectedSequences[0]);
  }

  private openOperationContextMenu(target: {
    itemIndex: number;
    x: number;
    y: number;
  }) {
    if ((this as any).$isViewerMode || !this.operationContextEnabled) {
      return;
    }

    this.contextMenuOpened = false;

    // for close and  open animation.
    this.$nextTick(() => {
      setTimeout(() => {
        this.contextMenuX = target.x;
        this.contextMenuY = target.y;
        this.contextMenuInfo = {
          sequence: target.itemIndex + 1,
          selectedSequences: this.selectedSequences,
        };
        this.contextMenuOpened = true;
      }, 100);
    });
  }

  private get selectedOperationIndexes() {
    return this.selectedSequences.map((sequence) => sequence - 1);
  }

  private get disabledOperationIndexes() {
    const disabledIndexes = [];
    let isCounting = false;

    for (const [index, { operation }] of this.history.entries()) {
      if (operation.type === "pause_capturing") {
        isCounting = true;
        continue;
      }

      if (operation.type === "resume_capturing") {
        isCounting = false;
        continue;
      }

      if (isCounting) {
        disabledIndexes.push(index);
      }
    }

    return disabledIndexes;
  }

  private get displayedHistory(): OperationHistory {
    return this.history.map((operationWithNotes) => {
      if (!operationWithNotes.operation.elementInfo) {
        return operationWithNotes;
      }

      const elementInfo = operationWithNotes.operation.elementInfo;

      const elementInfoForDisplay: ElementInfo = {
        tagname: elementInfo.tagname,
        text: elementInfo.text
          ? elementInfo.text
          : elementInfo.value
          ? elementInfo.value
          : "",
        xpath: elementInfo.xpath,
        value: elementInfo.value,
        checked: elementInfo.checked,
        attributes: elementInfo.attributes,
      };

      return {
        operation: Operation.createFromOtherOperation({
          other: operationWithNotes.operation,
          overrideParams: {
            elementInfo: elementInfoForDisplay,
          },
        }),
        bugs: operationWithNotes.bugs,
        notices: operationWithNotes.notices,
        intention: operationWithNotes.intention,
      };
    });
  }
}
</script>

<style lang="sass" scoped>
td
  height: inherit !important

.ellipsis
  overflow: hidden
  white-space: nowrap
  text-overflow: ellipsis
  max-width: 150px

.selected
  td
    font-weight: inherit

#operation-list
  position: relative

#operation-search
  position: relative

.icon-col
  padding: 0 !important

.seq-col
  padding-right: 8px !important
</style>

<style lang="sass">
#operation-search
  .v-text-field__details
    display: none

.icon-col
  padding: 0 !important

.seq-col
  padding-right: 8px !important
</style>
