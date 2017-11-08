import { Component, OnInit } from '@angular/core';

import { ActivityService } from 'app/services/activity.service';
import { GreensService } from 'app/services/greens.service';
import { LoggerService } from 'app/services/logger.service';
import { ElectronService } from 'app/services/electron.service';
import { PreferencesService } from 'app/services/preferences.service';

import { Erc } from '../../classes/erc';

@Component({
  selector: 'ark-editor',
  templateUrl: './ark-editor.component.html',
  styleUrls: [ './ark-editor.component.scss' ]
})
export class ArkEditorComponent implements OnInit {

  erc: Erc;
  ark: string = '';
  fetched: boolean = false;
  preferences: any;

  constructor(
    private activity: ActivityService,
    private minter: GreensService,
    private log: LoggerService,
    private electronService: ElectronService,
    private preferenceService: PreferencesService) {
  }

  ngOnInit(): void {
    this.preferenceService.preferencesChange.subscribe((data) => {
      this.preferences = data;
      this.setMinter();
    });
    this.preferences = this.preferenceService.data;
    this.setMinter();
    
    this.erc = this.createErc();
    this.fetched = false;
  }

  createErc(): Erc {
    let erc = new Erc(this.preferences.minter.ercWho, '', '', this.preferences.minter.ercWhere);
    erc.when = erc.toTodayISOString();
    return erc;
  }

  fetchArk(): void {
    if (this.ark === '') {
      this.log.warn('Please include a Ark to fetch');
      return;
    }
    this.activity.start();
    this.erc = new Erc();
    this.minter.get(this.ark)
      .then(erc => {
        this.erc = <Erc> erc;
        this.fetched = true;
        this.log.success('Fetched ark: ' + this.ark, false);
        this.activity.stop();
      })
      .catch(error => {
        this.log.error('Error getting ark: ' + this.ark);
        this.activity.stop();
      });
  }

  setMinter(): void {
    this.minter.setEndpoint(this.preferences.minter.endpoint, this.preferences.minter.prefix);
    this.minter.setApiKey(this.preferences.minter.key);
  }

  reset(): void {
    this.ark = '';
    this.fetched = false;
    this.erc = this.createErc();
  }

  generate(): void {
    this.activity.start()
    this.minter.mint(this.erc)
      .then(id => {
        this.activity.stop();
        this.fetched = true;
        this.log.success('Minted: ' + id);
        this.ark = id;
        if (this.erc.where.indexOf('$ark$') > -1) {
          this.erc.where = this.erc.where.replace('$ark$', id);
          this.minter.update(id, this.erc);
        }
      })
      .catch(error => {
        this.activity.stop();
        this.log.error('An error occured while minting a new ark: ' + error);
      });
  }

  save(): void {
    this.activity.start();
    this.minter.update(this.ark, this.erc)
      .then(erc => {
        this.activity.stop();
        this.log.success(this.ark + ' updated successfully');
      })
      .catch(error => {
        this.activity.stop();
        this.log.error('Unable to save changes to ' + this.ark + ': ' + error);
      });
  }

  copy(): void {
    let { clipboard } = this.electronService.remote;
    clipboard.write({text: this.ark});
  }

}
