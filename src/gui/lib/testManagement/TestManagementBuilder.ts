/**
 * Copyright 2022 NTT Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { TestMatrix, Story, ProgressData } from "./types";
import {
  TestManagementData,
  ManagedStory,
} from "@/lib/testManagement/TestManagementData";
import StoryDataConverter from "./StoryDataConverter";

/**
 * Class to convert data to storage format.
 */
export default class TestManagementBuilder {
  private _testMatrices: TestMatrix[] = [];
  private _stories: Story[] = [];
  private _progressDatas: ProgressData[] = [];

  /**
   * Set test matrices
   */
  set testMatrices(value: TestMatrix[]) {
    this._testMatrices = JSON.parse(JSON.stringify(value));
  }

  /**
   * Set stories
   */
  set stories(value: Story[]) {
    this._stories = JSON.parse(JSON.stringify(value));
  }

  /**
   * Set progressDatas
   */
  set progressDatas(value: ProgressData[]) {
    this._progressDatas = JSON.parse(JSON.stringify(value));
  }

  /**
   * Convert to a format for storing retained data
   * @returns TestManagementData  Converted data.
   */
  public build(): TestManagementData {
    const { managedStories } = this.buildManagedStoriesAndSequences();

    return {
      testMatrices: this._testMatrices,
      stories: managedStories,
      progressDatas: this._progressDatas,
    };
  }

  private buildManagedStoriesAndSequences() {
    const converter = new StoryDataConverter();

    return this._stories.reduce(
      (
        acc: {
          managedStories: ManagedStory[];
        },
        current
      ) => {
        const { storyData } = converter.convertToDataFormat(current);

        acc.managedStories.push(storyData);

        return acc;
      },
      { managedStories: [] }
    );
  }
}
