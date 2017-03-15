import { Component, OnInit } from '@angular/core';

import { ActivityService } from '../shared/activity.service';

@Component({
  selector: 'activity',
  templateUrl: './activity/activity.component.html',
  styles: [ require('./activity.component.scss') ]
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
