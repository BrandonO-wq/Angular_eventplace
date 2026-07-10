import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface VenueStats {
  id: string;
  name: string;
  owner: string;
  sport: string;
  rating: number;
  reviews: number;
  income: number;
}

@Component({
  selector: 'app-top-salones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-salones.component.html',
  styleUrls: ['./top-salones.component.css']
})
export class TopSalonesComponent implements OnInit, OnChanges {
  @Input() rawData: any[] = [];

  topVenues: VenueStats[] = [];

  ngOnInit() {
    this.processData();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rawData']) {
      this.processData();
    }
  }

  processData() {
    const data = this.rawData || [];
    const venueMap = new Map<string, VenueStats>();

    data.forEach((b: any) => {
      if (!venueMap.has(b.venueId)) {
        venueMap.set(b.venueId, {
          id: b.venueId,
          name: b.venueName,
          owner: b.hostName || 'No especificado',
          sport: b.eventTypes && b.eventTypes.length > 0 ? b.eventTypes[0] : 'General',
          rating: b.avgRating || 0,
          reviews: b.reviewCount || 0,
          income: 0
        });
      }
      const stats = venueMap.get(b.venueId)!;
      stats.income += b.totalAmount || 0;
    });

    this.topVenues = Array.from(venueMap.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
  }
}
