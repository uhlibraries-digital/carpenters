import { Component, OnInit } from '@angular/core';

import { ActivityService } from '../../services/activity.service';

@Component({
  selector: 'activity',
  templateUrl: './activity.component.html',
  styleUrls: [ './activity.component.scss' ]
})
export class ActivityComponent implements OnInit {

  private loading: Boolean = false;

  constructor(
    private activeService: ActivityService) {
  }

  ngOnInit(): void {
    this.activeService.active.subscribe((loading) => {
      this.loading = loading;
    });
  }

}
