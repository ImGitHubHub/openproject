import {injectorBridge} from '../angular/angular-injector-bridge.functions';
// -- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
// ++

import {WorkPackageTableSelection} from '../wp-fast-table/state/wp-table-selection.service';
import {wpDirectivesModule} from "../../angular-modules";
import {WorkPackageCreateService} from "./wp-create.service";
import {WorkPackageResource} from "../api/api-v3/hal-resources/work-package-resource.service";
import {WorkPackageCacheService} from "../work-packages/work-package-cache.service";
import IRootScopeService = angular.IRootScopeService;
import {WorkPackageEditModeStateService} from "../wp-edit/wp-edit-mode-state.service";
import {WorkPackageNotificationService} from '../wp-edit/wp-notification.service';
import {States} from '../states.service';

export class WorkPackageCreateController {
  public $state;
  public $rootScope:IRootScopeService;
  public $q:ng.IQService;
  public wpNotificationsService:WorkPackageNotificationService;
  public states:States;
  public loadingIndicator;
  public wpCreate:WorkPackageCreateService;
  public wpEditModeState:WorkPackageEditModeStateService;
  public wpTableSelection:WorkPackageTableSelection;
  public wpCacheService:WorkPackageCacheService;
  public I18n:op.I18n;


  public newWorkPackage:WorkPackageResource|any;
  public parentWorkPackage:WorkPackageResource|any;
  public successState:string;

  public get header():string {
    if (!this.newWorkPackage.type) {
      return this.I18n.t('js.work_packages.create.header_no_type');
    }

    if (this.parentWorkPackage) {
      return this.I18n.t(
        'js.work_packages.create.header_with_parent',
        {
          type: this.newWorkPackage.type.name,
          parent_type: this.parentWorkPackage.type.name,
          id: this.parentWorkPackage.id
        }
      );
    }

    if (this.newWorkPackage.type) {
      return this.I18n.t(
        'js.work_packages.create.header',
        { type: this.newWorkPackage.type.name }
      );
    }

  }

  constructor(public $injector, public $scope) {
    this.$inject('$state', '$rootScope', '$q', 'wpNotificationsService',
                 'wpCacheService', 'states', 'loadingIndicator', 'wpCreate',
                 'wpEditModeState', 'wpTableSelection', 'wpCacheService', 'I18n');

    this.newWorkPackageFromParams(this.$state.params)
      .then(wp => {
        this.newWorkPackage = wp;
        this.wpEditModeState.start();
        this.wpCacheService.updateWorkPackage(wp);

        if (this.$state.params.parent_id) {
          this.wpCacheService.loadWorkPackage(this.$state.params.parent_id).observeOnScope($scope)
            .subscribe(parent => {
              this.parentWorkPackage = parent;
              this.newWorkPackage.parent = parent;
            });
        }
      })
      .catch(error => this.wpNotificationsService.handleErrorResponse(error));
  }

  protected $inject(...args:string[]) {
    args.forEach(field => {
      this[field] = this.$injector.get(field);
    });
  }  

  protected newWorkPackageFromParams(stateParams) {
    const type = parseInt(stateParams.type);

    return this.wpCreate.createNewTypedWorkPackage(stateParams.projectPath, type);
  }

  public cancelAndBackToList() {
    this.wpEditModeState.cancel();
    this.$state.go('work-packages.list', this.$state.params);
  }

  public saveWorkPackage():ng.IPromise<WorkPackageResource> {
    return this.wpEditModeState.save();
  }

  public refreshAfterSave(wp, successState) {
    this.wpEditModeState.onSaved();
    this.wpTableSelection.focusOn(wp.id);
    this.loadingIndicator.mainPage = this.$state.go(successState, {workPackageId: wp.id})
      .then(() => {
        this.$rootScope.$emit('workPackagesRefreshInBackground');
        this.wpNotificationsService.showSave(wp, true);
      });
  }
}

wpDirectivesModule.controller('WorkPackageCreateController', WorkPackageCreateController);
