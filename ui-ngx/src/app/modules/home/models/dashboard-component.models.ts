///
/// Copyright © 2016-2019 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import { GridsterConfig, GridsterItem, GridsterComponent } from 'angular-gridster2';
import { Widget, widgetType } from '@app/shared/models/widget.models';
import { WidgetLayout, WidgetLayouts } from '@app/shared/models/dashboard.models';
import { WidgetAction, WidgetContext, WidgetHeaderAction } from './widget-component.models';
import { Timewindow } from '@shared/models/time/time.models';
import { Observable } from 'rxjs';
import { isDefined, isUndefined } from '@app/core/utils';
import { EventEmitter } from '@angular/core';
import { EntityId } from '@app/shared/models/id/entity-id';
import { IAliasController, IStateController, TimewindowFunctions } from '@app/core/api/widget-api.models';

export interface WidgetsData {
  widgets: Array<Widget>;
  widgetLayouts?: WidgetLayouts;
}

export interface DashboardCallbacks {
  onEditWidget?: ($event: Event, widget: Widget) => void;
  onExportWidget?: ($event: Event, widget: Widget) => void;
  onRemoveWidget?: ($event: Event, widget: Widget) => void;
  onWidgetMouseDown?: ($event: Event, widget: Widget) => void;
  onWidgetClicked?: ($event: Event, widget: Widget) => void;
  prepareDashboardContextMenu?: ($event: Event) => void;
  prepareWidgetContextMenu?: ($event: Event, widget: Widget) => void;
}

export interface IDashboardComponent {
  gridsterOpts: GridsterConfig;
  gridster: GridsterComponent;
  dashboardWidgets: DashboardWidgets;
  mobileAutofillHeight: boolean;
  isMobileSize: boolean;
  autofillHeight: boolean;
  dashboardTimewindow: Timewindow;
  dashboardTimewindowChanged: Observable<Timewindow>;
  aliasController: IAliasController;
  stateController: IStateController;
  onUpdateTimewindow(startTimeMs: number, endTimeMs: number, interval?: number): void;
  onResetTimewindow(): void;
}

export class DashboardWidgets implements Iterable<DashboardWidget> {

  dashboardWidgets: Array<DashboardWidget> = [];

  [Symbol.iterator](): Iterator<DashboardWidget> {
    return this.dashboardWidgets[Symbol.iterator]();
  }

  constructor(private dashboard: IDashboardComponent) {
  }

  setWidgets(widgets: Array<Widget>, widgetLayouts: WidgetLayouts) {
    let maxRows = this.dashboard.gridsterOpts.maxRows;
    this.dashboardWidgets.length = 0;
    widgets.forEach((widget) => {
      let widgetLayout: WidgetLayout;
      if (widgetLayouts && widget.id) {
        widgetLayout = widgetLayouts[widget.id];
      }
      const dashboardWidget = new DashboardWidget(this.dashboard, widget, widgetLayout);
      const bottom = dashboardWidget.y + dashboardWidget.rows;
      maxRows = Math.max(maxRows, bottom);
      this.dashboardWidgets.push(dashboardWidget);
    });
    this.sortWidgets();
    this.dashboard.gridsterOpts.maxRows = maxRows;
  }

  addWidget(widget: Widget, widgetLayout: WidgetLayout) {
    const dashboardWidget = new DashboardWidget(this.dashboard, widget, widgetLayout);
    let maxRows = this.dashboard.gridsterOpts.maxRows;
    const bottom = dashboardWidget.y + dashboardWidget.rows;
    maxRows = Math.max(maxRows, bottom);
    this.dashboardWidgets.push(dashboardWidget);
    this.sortWidgets();
    this.dashboard.gridsterOpts.maxRows = maxRows;
  }

  removeWidget(widget: Widget): boolean {
    const index = this.dashboardWidgets.findIndex((dashboardWidget) => dashboardWidget.widget === widget);
    if (index > -1) {
      this.dashboardWidgets.splice(index, 1);
      let maxRows = this.dashboard.gridsterOpts.maxRows;
      this.dashboardWidgets.forEach((dashboardWidget) => {
        const bottom = dashboardWidget.y + dashboardWidget.rows;
        maxRows = Math.max(maxRows, bottom);
      });
      this.sortWidgets();
      this.dashboard.gridsterOpts.maxRows = maxRows;
      return true;
    }
    return false;
  }

  sortWidgets() {
    this.dashboardWidgets.sort((widget1, widget2) => {
      const row1 = widget1.widgetOrder;
      const row2 = widget2.widgetOrder;
      let res = row1 - row2;
      if (res === 0) {
        res = widget1.x - widget2.x;
      }
      return res;
    });
  }

}

export class DashboardWidget implements GridsterItem {

  isFullscreen = false;

  color: string;
  backgroundColor: string;
  padding: string;
  margin: string;

  title: string;
  showTitle: boolean;
  titleStyle: {[klass: string]: any};

  titleIcon: string;
  showTitleIcon: boolean;
  titleIconStyle: {[klass: string]: any};

  dropShadow: boolean;
  enableFullscreen: boolean;

  hasTimewindow: boolean;

  hasAggregation: boolean;

  style: {[klass: string]: any};

  hasWidgetTitleTemplate: boolean;
  widgetTitleTemplate: string;

  showWidgetTitlePanel: boolean;
  showWidgetActions: boolean;

  customHeaderActions: Array<WidgetHeaderAction>;
  widgetActions: Array<WidgetAction>;

  widgetContext: WidgetContext = {};

  constructor(
    private dashboard: IDashboardComponent,
    public widget: Widget,
    private widgetLayout?: WidgetLayout) {
    this.updateWidgetParams();
  }

  updateWidgetParams() {
    this.color = this.widget.config.color || 'rgba(0, 0, 0, 0.87)';
    this.backgroundColor = this.widget.config.backgroundColor || '#fff';
    this.padding = this.widget.config.padding || '8px';
    this.margin = this.widget.config.margin || '0px';

    this.title = isDefined(this.widgetContext.widgetTitle)
      && this.widgetContext.widgetTitle.length ? this.widgetContext.widgetTitle : this.widget.config.title;
    this.showTitle = isDefined(this.widget.config.showTitle) ? this.widget.config.showTitle : true;
    this.titleStyle = this.widget.config.titleStyle ? this.widget.config.titleStyle : {};

    this.titleIcon = isDefined(this.widget.config.titleIcon) ? this.widget.config.titleIcon : '';
    this.showTitleIcon = isDefined(this.widget.config.showTitleIcon) ? this.widget.config.showTitleIcon : false;
    this.titleIconStyle = {};
    if (this.widget.config.iconColor) {
      this.titleIconStyle.color = this.widget.config.iconColor;
    }
    if (this.widget.config.iconSize) {
      this.titleIconStyle.fontSize = this.widget.config.iconSize;
    }

    this.dropShadow = isDefined(this.widget.config.dropShadow) ? this.widget.config.dropShadow : true;
    this.enableFullscreen = isDefined(this.widget.config.enableFullscreen) ? this.widget.config.enableFullscreen : true;

    this.hasTimewindow = (this.widget.type === widgetType.timeseries || this.widget.type === widgetType.alarm) ?
      (isDefined(this.widget.config.useDashboardTimewindow) ?
        (!this.widget.config.useDashboardTimewindow && (isUndefined(this.widget.config.displayTimewindow)
          || this.widget.config.displayTimewindow)) : false)
      : false;

    this.hasAggregation = this.widget.type === widgetType.timeseries;

    this.style = {cursor: 'pointer',
      color: this.color,
      backgroundColor: this.backgroundColor,
      padding: this.padding,
      margin: this.margin};
    if (this.widget.config.widgetStyle) {
      this.style = {...this.widget.config.widgetStyle, ...this.style};
    }

    this.hasWidgetTitleTemplate = this.widgetContext.widgetTitleTemplate ? true : false;
    this.widgetTitleTemplate = this.widgetContext.widgetTitleTemplate ? this.widgetContext.widgetTitleTemplate : '';

    this.showWidgetTitlePanel = this.widgetContext.hideTitlePanel ? false :
      this.hasWidgetTitleTemplate || this.showTitle || this.hasTimewindow;

    this.showWidgetActions = this.widgetContext.hideTitlePanel ? false : true;

    this.customHeaderActions = this.widgetContext.customHeaderActions ? this.widgetContext.customHeaderActions : [];
    this.widgetActions = this.widgetContext.widgetActions ? this.widgetContext.widgetActions : [];
  }

  get x(): number {
    if (this.widgetLayout) {
      return this.widgetLayout.col;
    } else {
      return this.widget.col;
    }
  }

  set x(x: number) {
    if (!this.dashboard.isMobileSize) {
      if (this.widgetLayout) {
        this.widgetLayout.col = x;
      } else {
        this.widget.col = x;
      }
    }
  }

  get y(): number {
    if (this.widgetLayout) {
      return this.widgetLayout.row;
    } else {
      return this.widget.row;
    }
  }

  set y(y: number) {
    if (!this.dashboard.isMobileSize) {
      if (this.widgetLayout) {
        this.widgetLayout.row = y;
      } else {
        this.widget.row = y;
      }
    }
  }

  get cols(): number {
    if (this.widgetLayout) {
      return this.widgetLayout.sizeX;
    } else {
      return this.widget.sizeX;
    }
  }

  set cols(cols: number) {
    if (!this.dashboard.isMobileSize) {
      if (this.widgetLayout) {
        this.widgetLayout.sizeX = cols;
      } else {
        this.widget.sizeX = cols;
      }
    }
  }

  get rows(): number {
    if (this.dashboard.isMobileSize && !this.dashboard.mobileAutofillHeight) {
      let mobileHeight;
      if (this.widgetLayout) {
        mobileHeight = this.widgetLayout.mobileHeight;
      }
      if (!mobileHeight && this.widget.config.mobileHeight) {
        mobileHeight = this.widget.config.mobileHeight;
      }
      if (mobileHeight) {
        return mobileHeight;
      } else {
        return this.widget.sizeY * 24 / this.dashboard.gridsterOpts.minCols;
      }
    } else {
      if (this.widgetLayout) {
        return this.widgetLayout.sizeY;
      } else {
        return this.widget.sizeY;
      }
    }
  }

  set rows(rows: number) {
    if (!this.dashboard.isMobileSize && !this.dashboard.autofillHeight) {
      if (this.widgetLayout) {
        this.widgetLayout.sizeY = rows;
      } else {
        this.widget.sizeY = rows;
      }
    }
  }

  get widgetOrder(): number {
    let order;
    if (this.widgetLayout && isDefined(this.widgetLayout.mobileOrder) && this.widgetLayout.mobileOrder >= 0) {
      order = this.widgetLayout.mobileOrder;
    } else if (isDefined(this.widget.config.mobileOrder) && this.widget.config.mobileOrder >= 0) {
      order = this.widget.config.mobileOrder;
    } else if (this.widgetLayout) {
      order = this.widgetLayout.row;
    } else {
      order = this.widget.row;
    }
    return order;
  }
}